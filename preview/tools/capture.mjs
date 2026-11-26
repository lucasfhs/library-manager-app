// Capture the real app without touching its source, existing databases or Docker volumes.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import EmbeddedPostgres from "embedded-postgres";
import copyStreams from "pg-copy-streams";
import { chromium } from "playwright";

const tools = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(tools, "../..");
const output = path.join(tools, ".capture");
await mkdir(output, { recursive: true });
const runtimeRoot = process.env.PREVIEW_TMP || (
  (await import("node:fs")).existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir()
);
const runtime = await mkdtemp(path.join(runtimeRoot, "library-preview-"));
const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
const dbPort = await freePort();
const apiPort = await freePort();
const webPort = await freePort();
const base = `http://127.0.0.1:${webPort}`;
const api = `http://127.0.0.1:${apiPort}`;
const password = randomBytes(20).toString("hex");
const pg = new EmbeddedPostgres({
  databaseDir: path.join(runtime, "database"),
  user: "gomes_library_system_user", password, port: dbPort, persistent: false,
  postgresFlags: ["-h", "127.0.0.1", "-k", runtime],
  onLog: () => {}, onError: (error) => console.error(error),
});
const env = {
  ...process.env, DB_HOST: "127.0.0.1", DB_PORT: String(dbPort),
  DB_USER: "gomes_library_system_user", DB_PASSWORD: password,
  DB_NAME: "library_preview", DB_SSL: "false",
  SECRET_KEY: randomBytes(32).toString("hex"), CORS_ORIGIN: base,
  PORT: String(apiPort), VITE_API_URL: api,
};
const children = [];
const logs = [];
function start(name, args, cwd) {
  const log = createWriteStream(path.join(output, `${name}.log`));
  logs.push(log);
  const child = spawn(process.execPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  children.push(child);
  return child;
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    if (children.some((child) => child.exitCode !== null)) {
      throw new Error(`A service exited. See ${output}/*.log`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Service not ready: ${url}`);
}

let browser;
let client;
let started = false;
const scenes = [];
const checks = [];
const errors = [];
try {
  console.log("Starting isolated PostgreSQL 16:", runtime);
  await pg.initialise();
  await pg.start();
  started = true;
  await pg.createDatabase("library_preview");
  client = pg.getPgClient("library_preview", "127.0.0.1");
  await client.connect();
  // Preserve COPY's escaping and composite types through the PostgreSQL COPY protocol.
  const sql = await readFile(path.join(root, "backend/database/init.sql"), "utf8");
  const copies = /^(COPY [^\n]+ FROM stdin;)\n([\s\S]*?)^\\\.\r?$/gm;
  let offset = 0;
  for (const match of sql.matchAll(copies)) {
    await client.query(sql.slice(offset, match.index));
    const stream = client.query(copyStreams.from(match[1]));
    await pipeline(Readable.from([match[2]]), stream);
    offset = match.index + match[0].length;
  }
  await client.query(sql.slice(offset));
  checks.push({ check: "Seed SQL imported into isolated PostgreSQL 16", passed: true });
  await client.end();
  client = null;

  start("backend", ["index.js"], path.join(root, "backend"));
  start("frontend", ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1",
    "--port", String(webPort), "--strictPort"], path.join(root, "frontend"));
  await Promise.all([ready(`${api}/health`), ready(base)]);
  checks.push({ check: "Backend /health and frontend HTTP", passed: true });

  browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 720 }, deviceScaleFactor: 1,
    locale: "pt-BR", colorScheme: "light", reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", async (dialog) => {
    if (dialog.message() !== "Login bem-sucedido!") errors.push(dialog.message());
    await dialog.accept();
  });
  const labels = {
    home: ["01 / BOAS-VINDAS", "Uma biblioteca, muitas possibilidades.",
      "Uma visão geral do Library Manager e dos perfis de acesso."],
    login: ["02 / ACESSO", "Cada perfil tem seu espaço.",
      "Login de operador validado pela API Express e pelo PostgreSQL."],
    admin: ["03 / ACERVO", "Os detalhes fazem a diferença.",
      "Edição dos campos do livro na interface administrativa."],
    library: ["04 / BIBLIOTECAS", "Disponibilidade em poucos cliques.",
      "Ajuste de exemplares na tela de livros por biblioteca."],
    catalog: ["05 / LEITORES", "Do livro à biblioteca.",
      "Consulte a ficha e abra a relação de bibliotecas no pop-up."],
    loans: ["06 / EMPRÉSTIMOS", "O histórico, em um só lugar.",
      "Livros, bibliotecas e datas reunidos na visão do leitor."],
    closing: ["LIBRARY MANAGER", "Conheça o projeto por dentro.",
      "React + Vite  /  Node.js + Express  /  PostgreSQL"],
  };
  async function shot(section, seconds, target, clicked = false) {
    const pointer = target ? await target.boundingBox() : null;
    const name = `${String(scenes.length).padStart(3, "0")}-${section}.png`;
    await page.screenshot({ path: path.join(output, name) });
    scenes.push({
      image: name, section, seconds, labels: labels[section],
      pointer: pointer ? { x: pointer.x + pointer.width / 2,
        y: pointer.y + pointer.height / 2, clicked } : null,
      note: ["admin", "library"].includes(section)
        ? "Demonstração da interface • alterações locais, sem persistência"
        : ["catalog", "loans"].includes(section)
          ? "Demonstração da interface • dados de exemplo"
          : "Captura real da aplicação • execução local",
    });
  }
  async function goto(route) {
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
  }

  await goto("/");
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(120);
    await shot("home", 0.25);
  }
  const employee = page.getByRole("button", { name: "Funcionário", exact: true });
  await employee.hover();
  await shot("home", 0.7, employee);
  await employee.click();
  await page.waitForURL("**/loginAdmin");
  await shot("login", 0.7);
  const user = page.locator('input[type="text"]');
  await user.fill("admin");
  await shot("login", 0.6, user);
  const pass = page.locator('input[type="password"]');
  await pass.fill("admin");
  await shot("login", 0.6, pass);
  const enter = page.getByRole("button", { name: "Entrar", exact: true });
  await shot("login", 0.7, enter);
  const loginResponse = page.waitForResponse((r) => r.url().endsWith("/auth/loginAdmin"));
  await enter.click();
  if (!(await loginResponse).ok()) throw new Error("Real API login failed.");
  await page.waitForURL("**/admin");
  checks.push({ check: "Real admin login from browser through API", passed: true });

  await shot("admin", 1.5);
  const title = page.locator('input[name="titulo"]').first();
  await title.fill("Revolução dos Bichos");
  await shot("admin", 1.2, title);
  const pages = page.locator('input[name="paginas"]').first();
  await pages.fill("144");
  await shot("admin", 0.8, pages);
  const change = page.getByRole("button", { name: "Alterar", exact: true }).first();
  await change.click();
  await shot("admin", 1.5, change, true);
  if (await pages.inputValue() !== "144") throw new Error("Book edit did not appear.");
  checks.push({ check: "Book fields edited in local React state", passed: true });

  // These routes are opened directly: the current navigation buttons have no handlers.
  await goto("/library");
  await shot("library", 1.2);
  const editStock = page.getByRole("button", { name: "Alterar", exact: true }).first();
  await editStock.click();
  await shot("library", 0.8, editStock, true);
  const plus = page.getByRole("button", { name: "+", exact: true }).first();
  await plus.click();
  await shot("library", 0.6, plus, true);
  await plus.click();
  await shot("library", 0.6, plus, true);
  const save = page.getByRole("button", { name: "Salvar", exact: true }).first();
  await save.click();
  // Native text selection makes the current value readable despite the existing
  // white-on-white input style. Do not restyle the app just for the recording.
  await page.locator('input[name="quantidadeDisponivel"]').first().selectText();
  await shot("library", 1.6, page.locator('input[name="quantidadeDisponivel"]').first(), true);
  if (await page.locator('input[name="quantidadeDisponivel"]').first().inputValue() !== "12") {
    throw new Error("Stock edit did not appear.");
  }
  checks.push({ check: "Stock incremented from 10 to 12 in local React state", passed: true });

  await goto("/user");
  await shot("catalog", 1.5);
  const popup = page.getByRole("button", { name: "Bibliotecas que Possuem o Livro" });
  await shot("catalog", 0.8, popup);
  await popup.click();
  await shot("catalog", 2, page.getByRole("heading", { name: "Bibliotecas que Possuem o Livro" }));
  const close = page.getByRole("button", { name: "Fechar", exact: true });
  await close.click();
  await shot("catalog", 0.8);
  checks.push({ check: "Reader library popup opened and closed", passed: true });

  await goto("/loan");
  await shot("loans", 2.8);
  checks.push({ check: "Sample loan history rendered", passed: await page.getByText("O Senhor dos Anéis").isVisible() });
  await goto("/");
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(120);
    await shot("closing", 0.25);
  }
  await writeFile(path.join(output, "scenes.json"), JSON.stringify(scenes, null, 2));
  const validation = { checks, browserErrors: errors, viewport: { width: 1200, height: 720 } };
  await writeFile(path.join(output, "validation.json"), JSON.stringify(validation, null, 2));
  if (errors.length || checks.some((check) => !check.passed)) {
    throw new Error(`Capture checks failed: ${JSON.stringify(validation)}`);
  }
  console.log(`Captured ${scenes.length} screenshots. All ${checks.length} checks passed.`);
  console.log(`Assets: ${output}`);
} finally {
  await browser?.close();
  await client?.end();
  await Promise.all(children.map(async (child) => {
    if (child.exitCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timer);
  }));
  for (const log of logs) log.end();
  if (started) await pg.stop();
}
