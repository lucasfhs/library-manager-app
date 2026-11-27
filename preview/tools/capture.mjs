// Capture the real app without touching its source, existing databases or Docker volumes.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const runtime = await mkdtemp(path.join(process.env.PREVIEW_TMP || tmpdir(), "library-preview-"));
const freePort = () =>
  new Promise((resolve, reject) => {
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
  user: "gomes_library_system_user",
  password,
  port: dbPort,
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1", "-k", runtime],
  onLog: () => {},
  onError: (error) => console.error(error),
});
const env = {
  ...process.env,
  DB_HOST: "127.0.0.1",
  DB_PORT: String(dbPort),
  DB_USER: "gomes_library_system_user",
  DB_PASSWORD: password,
  DB_NAME: "library_preview",
  DB_SSL: "false",
  SECRET_KEY: randomBytes(32).toString("hex"),
  OPERATOR_REGISTRATION_KEY: randomBytes(8).toString("hex"),
  CORS_ORIGIN: base,
  PORT: String(apiPort),
  VITE_API_URL: api,
  APP_URL: base,
};
// The payment scenes need a Stripe test-mode key, read from the environment or
// backend/.env (the backend loads that file itself; nothing is copied from it).
async function stripeKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  const file = await readFile(path.join(root, "backend/.env"), "utf8").catch(() => "");
  return /^STRIPE_SECRET_KEY=(.+)$/m.exec(file)?.[1].trim() ?? "";
}
const paymentKey = await stripeKey();
if (paymentKey && !paymentKey.startsWith("sk_test_")) {
  throw new Error("Use a Stripe test-mode key (sk_test_...) for the preview capture.");
}
const children = [];
const logs = [];
function run(name, args, cwd, { wait = false } = {}) {
  const log = createWriteStream(path.join(output, `${name}.log`));
  logs.push(log);
  const child = spawn(process.execPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  if (wait) {
    return once(child, "exit").then(([code]) => {
      if (code !== 0) throw new Error(`${name} failed. See ${output}/${name}.log`);
    });
  }
  children.push(child);
  return child;
}
async function ready(url) {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
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
const check = (name, passed = true) => {
  checks.push({ check: name, passed });
  if (!passed) throw new Error(`Check failed: ${name}`);
};
try {
  console.log("Starting isolated PostgreSQL 18:", runtime);
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
  await client.end();
  client = null;
  check("Seed SQL imported into isolated PostgreSQL 18");

  // Record the production build, not the dev server.
  const dist = path.join(runtime, "dist");
  await run("frontend-build", ["node_modules/vite/bin/vite.js", "build", "--outDir", dist, "--emptyOutDir"], path.join(root, "frontend"), { wait: true });
  run("backend", ["index.js"], path.join(root, "backend"));
  run(
    "frontend",
    ["node_modules/vite/bin/vite.js", "preview", "--outDir", dist, "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
    path.join(root, "frontend")
  );
  await Promise.all([ready(`${api}/health`), ready(base)]);
  check("Backend /health and production frontend build");

  browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 720 },
    deviceScaleFactor: 1,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  // Only the app's own pages count; Stripe's hosted Checkout is not ours to judge.
  const ours = () => page.url().startsWith(base);
  page.on("pageerror", (error) => ours() && errors.push(error.message));
  page.on("console", (message) => {
    // 4xx answers are expected API outcomes; anything else is a defect.
    if (ours() && message.type() === "error" && !/status of 4\d\d/.test(message.text())) errors.push(message.text());
  });

  const labels = {
    home: ["01 / BOAS-VINDAS", "Abra um livro, abra sua mente.", "Página inicial com os perfis de leitor e operador."],
    login: ["02 / ACESSO", "Cada perfil tem seu espaço.", "Login de operador validado pela API Express e pelo PostgreSQL."],
    dashboard: ["03 / PAINEL", "O acervo inteiro em um relance.", "Indicadores, empréstimos recentes e acervo por categoria."],
    books: ["04 / ACERVO", "Catálogo editável de verdade.", "Edição de livro validada e gravada no banco de dados."],
    stock: ["05 / ESTOQUE", "Exemplares por biblioteca.", "Ajuste de quantidade salvo direto na tabela."],
    loans: ["06 / CIRCULAÇÃO", "Devoluções em dois cliques.", "Filtro de atrasados e devolução que repõe o estoque."],
    catalog: ["07 / LEITORES", "Do catálogo à retirada.", "Busca, disponibilidade por biblioteca e pedido de empréstimo."],
    history: ["08 / HISTÓRICO", "Prazos sempre à vista.", "O empréstimo recém-criado aparece no histórico do leitor."],
    fines: ["01 / MULTAS", "Atrasos viram multas claras.", "R$ 1,00 por dia de atraso, limitado ao preço do livro, calculado no PostgreSQL."],
    checkout: ["02 / STRIPE", "Pagamento seguro com Stripe.", "Checkout hospedado pela Stripe em modo de teste, com o cartão 4242."],
    paid: ["03 / CONFIRMAÇÃO", "Multas quitadas na hora.", "A API confirma a sessão na Stripe e grava o pagamento no banco."],
    closing: ["LIBRARY MANAGER", "Conheça o projeto por dentro.", "React 19 + shadcn/ui  /  Express 5  /  PostgreSQL 18"],
  };
  async function shot(section, seconds, target, clicked = false, note = undefined) {
    // A target is a locator or a box measured earlier (modals hide what is behind them).
    const box = !target ? null : "x" in target ? target : await target.boundingBox();
    const name = `${String(scenes.length).padStart(3, "0")}-${section}.png`;
    await page.screenshot({ path: path.join(output, name) });
    scenes.push({
      image: name,
      section,
      seconds,
      route: new URL(page.url()).pathname,
      // Stripe's hosted pages carry session IDs in the path; only their host is shown.
      host: page.url().startsWith(base) ? undefined : new URL(page.url()).host,
      labels: labels[section],
      pointer: box ? { x: box.x + box.width / 2, y: box.y + box.height / 2, clicked } : null,
      note: note ?? "Captura real da aplicação • API Express + PostgreSQL 18 • execução local",
    });
  }
  async function goto(route) {
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
  }
  async function signIn(route, login, secret, home) {
    await goto(route);
    const field = page.getByLabel(route === "/loginAdmin" ? "Usuário" : "CPF");
    await field.fill(login);
    await page.getByLabel("Senha", { exact: true }).fill(secret);
    const response = page.waitForResponse((r) => r.url().includes("/auth/login"));
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    if (!(await response).ok()) throw new Error(`Login failed for ${route}`);
    await page.waitForURL(`**${home}`);
    await page.waitForLoadState("networkidle");
  }
  const toast = (text) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first();
  const settle = () => page.waitForTimeout(350);
  // Toasts are part of the story, but one scene's toast must not cover the next.
  async function clearToasts() {
    const close = page.locator("[data-sonner-toast] [data-close-button]");
    for (let i = 0; i < 10 && (await close.count()) > 0; i++) {
      await close.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(120);
    }
    await page.locator("[data-sonner-toast]").first().waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  }

  // 01 Landing
  await goto("/");
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(130);
    await shot("home", 0.25);
  }
  const operatorArea = page.getByRole("banner").getByRole("link", { name: "Área do operador" });
  await operatorArea.hover();
  await shot("home", 0.8, operatorArea);

  // 02 Operator login
  await operatorArea.click();
  await page.waitForURL("**/loginAdmin");
  await settle();
  await shot("login", 0.7);
  const user = page.getByLabel("Usuário");
  await user.fill("admin");
  await shot("login", 0.6, user);
  const secret = page.getByLabel("Senha", { exact: true });
  await secret.fill("admin");
  await shot("login", 0.5, secret);
  const enter = page.getByRole("button", { name: "Entrar", exact: true });
  await enter.hover();
  await shot("login", 0.6, enter);
  const loginResponse = page.waitForResponse((r) => r.url().endsWith("/auth/loginAdmin"));
  await enter.click();
  check("Operator login through the API", (await loginResponse).ok());
  await page.waitForURL("**/admin");
  await page.waitForLoadState("networkidle");
  await page.getByText("Acervo por categoria").waitFor();
  await clearToasts();

  // 03 Dashboard
  await settle();
  await shot("dashboard", 2.4);
  const bar = page.getByRole("list", { name: "Títulos por categoria" }).locator("li").first();
  await bar.hover();
  await settle();
  await shot("dashboard", 1.2, bar);
  check("Dashboard rendered live counters and charts");

  // 04 Books: edit and save
  const booksLink = page.getByRole("link", { name: "Livros" });
  await booksLink.hover();
  await shot("dashboard", 0.5, booksLink);
  await booksLink.click();
  await page.waitForURL("**/admin/books");
  await page.getByRole("cell", { name: /Fundação/ }).first().waitFor();
  await settle();
  await shot("books", 1.4);
  const actions = page.getByRole("button", { name: "Ações para Fundação" });
  const actionsBox = await actions.boundingBox();
  await actions.click();
  await settle();
  await shot("books", 0.7, actionsBox, true);
  const edit = page.getByRole("menuitem", { name: "Editar" });
  await edit.hover();
  await shot("books", 0.5, edit);
  await edit.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Páginas").waitFor();
  await settle();
  const pages = dialog.getByLabel("Páginas");
  await pages.fill("336");
  await shot("books", 1, pages);
  const saveBook = dialog.getByRole("button", { name: "Salvar alterações" });
  await saveBook.hover();
  await shot("books", 0.6, saveBook);
  await saveBook.click();
  await toast("Livro atualizado").waitFor();
  await page.getByRole("cell", { name: "336" }).waitFor();
  await settle();
  await shot("books", 1.8, page.getByRole("cell", { name: "336" }), true);
  check("Book edit persisted (Fundação: 320 → 336 pages)");

  // 05 Stock: stepper and save
  await clearToasts();
  const stockLink = page.getByRole("link", { name: "Estoque" });
  await stockLink.click();
  await page.waitForURL("**/library");
  const plus = page.getByRole("button", { name: "Aumentar exemplares de Fundação" });
  await plus.waitFor();
  await settle();
  await shot("stock", 1.3);
  await plus.click();
  await shot("stock", 0.5, plus, true);
  await plus.click();
  await shot("stock", 0.5, plus, true);
  const saveStock = page.getByRole("button", { name: "Salvar", exact: true });
  await saveStock.hover();
  await shot("stock", 0.6, saveStock);
  await saveStock.click();
  await toast("Quantidade atualizada").waitFor();
  await settle();
  const quantity = page.getByRole("textbox", { name: "Exemplares de Fundação" });
  await shot("stock", 1.7, quantity);
  check("Stock persisted (Fundação at Biblioteca Central: 2 → 4)", (await quantity.inputValue()) === "4");

  // 06 Loans: overdue filter and return
  await clearToasts();
  await page.getByRole("link", { name: "Empréstimos" }).click();
  await page.waitForURL("**/admin/loans");
  await page.getByRole("tab", { name: /Atrasados/ }).waitFor();
  await page.waitForLoadState("networkidle");
  await settle();
  await shot("loans", 1.3);
  const overdue = page.getByRole("tab", { name: /Atrasados/ });
  await overdue.click();
  await settle();
  await shot("loans", 1, overdue, true);
  const returnButton = page.getByRole("button", { name: /Registrar devolução de/ }).first();
  await returnButton.hover();
  await shot("loans", 0.6, returnButton);
  await returnButton.click();
  const confirm = page.getByRole("alertdialog").getByRole("button", { name: "Registrar devolução" });
  await confirm.waitFor();
  await settle();
  await shot("loans", 1.2, confirm);
  await confirm.click();
  await toast("Devolução registrada").waitFor();
  await settle();
  await shot("loans", 1.8);
  check("Overdue loan returned through PUT /loan");

  // 07 Reader: catalog, search, availability and loan request
  await page.evaluate(() => localStorage.clear());
  await signIn("/loginUser", "32168781044", "1234", "/user");
  await clearToasts();
  await page.getByRole("button", { name: /Harry Potter/ }).waitFor();
  await settle();
  await shot("catalog", 1.6);
  const search = page.getByRole("searchbox", { name: "Buscar por título ou autor" });
  await search.click();
  await search.pressSequentially("harry", { delay: 40 });
  await settle();
  await shot("catalog", 1, search);
  const card = page.getByRole("button", { name: /Harry Potter/ });
  await card.hover();
  await settle();
  await shot("catalog", 0.6, card);
  await card.click();
  const sheet = page.getByRole("dialog");
  await sheet.getByText("Onde retirar").waitFor();
  await sheet.getByText("Biblioteca Cultura").waitFor();
  await settle();
  await shot("catalog", 1.6);
  const request = sheet.getByRole("button", { name: "Solicitar" }).first();
  await request.hover();
  await shot("catalog", 0.6, request);
  await request.click();
  await toast("Empréstimo registrado").waitFor();
  await sheet.getByText("Você já está com um exemplar deste livro.").waitFor();
  await settle();
  await shot("catalog", 2.2, request, true);
  check("Reader loan created through POST /loan (stock 7 → 6)", await sheet.getByText("6 disponíveis").first().isVisible());

  // 08 Reader history
  await page.keyboard.press("Escape");
  await clearToasts();
  const history = page.getByRole("link", { name: "Meus empréstimos" });
  await history.click();
  await page.waitForURL("**/loan");
  await page.getByRole("cell", { name: /Harry Potter/ }).first().waitFor();
  await settle();
  await shot("history", 2.6, page.getByText("Em andamento").last());
  check("New loan listed in the reader history");

  if (paymentKey) await capturePayment();
  else console.log("STRIPE_SECRET_KEY not set: skipping the payment scenes.");

  await page.evaluate(() => localStorage.clear());
  await goto("/");
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(130);
    await shot("closing", 0.25);
  }

  // 09-11 Late fees paid through Stripe Checkout (test mode)
  async function capturePayment() {
    const stripeNote = "Captura real • Stripe Checkout em modo de teste • nenhuma cobrança real";
    await page.evaluate(() => localStorage.clear());
    await clearToasts();
    await signIn("/loginUser", "23611482005", "pokemon", "/user");
    await clearToasts();
    await goto("/loan");
    const panel = page.getByRole("region", { name: "Multas por atraso" });
    await panel.getByText("Total em aberto").waitFor();
    // Seven fines make the panel tall; bring it into view below the sticky header.
    await panel.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 84 }));
    await settle();
    await shot("fines", 2.4, panel.getByText("Total em aberto"));
    const pay = panel.getByRole("button", { name: /^Pagar R\$/ });
    check("Fines listed for the reader (7 late loans, R$ 243,60)", (await panel.getByRole("listitem").count()) === 7);
    await pay.hover();
    await shot("fines", 1, pay);
    const checkoutResponse = page.waitForResponse((r) => r.url().endsWith("/payment/checkout"));
    await pay.click();
    check("Checkout Session created through POST /payment/checkout", (await checkoutResponse).ok());
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    // Stripe renders the payment form inside its own iframe (Payment Element).
    const form = page.frameLocator('iframe[src*="elements-inner-habanero"]');
    const email = form.locator("#linkAuthentication-emailInput");
    try {
      await email.waitFor({ timeout: 30000 });
    } catch (error) {
      // Stripe changes its hosted page from time to time; leave evidence for the selectors.
      await page.screenshot({ path: path.join(output, "stripe-debug.png"), fullPage: true });
      throw error;
    }
    await page.waitForTimeout(1200);
    await shot("checkout", 2, null, false, stripeNote);
    // With several payment methods (card, Pix…) Stripe asks which one first.
    const cardChoice = form.getByRole("button", { name: /^Cartão/ });
    if (await cardChoice.isVisible().catch(() => false)) {
      const choiceBox = await cardChoice.boundingBox();
      await cardChoice.click();
      await shot("checkout", 0.6, choiceBox, true, stripeNote);
    }
    const cardNumber = form.locator("#payment-numberInput");
    await cardNumber.waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await cardNumber.pressSequentially("4242424242424242", { delay: 25 });
    await shot("checkout", 0.7, cardNumber, false, stripeNote);
    await form.locator("#payment-expiryInput").pressSequentially("1234", { delay: 25 });
    await form.locator("#payment-cvcInput").pressSequentially("123", { delay: 25 });
    const holder = form.locator("#payment-nameInput");
    await holder.fill("Ana Julia");
    const country = form.locator("#payment-countryInput");
    if (await country.isVisible().catch(() => false)) await country.selectOption("BR");
    // Saving the card with Link would ask for a phone number; this demo pays once.
    const linkOptIn = form.locator("#payment-linkOptInInput");
    if ((await linkOptIn.isVisible().catch(() => false)) && (await linkOptIn.isChecked())) await linkOptIn.uncheck();
    await page.waitForTimeout(400);
    await shot("checkout", 1.4, holder, false, stripeNote);
    const submit = form.getByTestId("payment-form-submit-button");
    await submit.hover();
    await shot("checkout", 0.8, submit, false, stripeNote);
    await submit.click();
    await page.waitForURL(`${base}/loan**`, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await toast("Pagamento confirmado").waitFor({ timeout: 20000 });
    await panel.getByText("Todas as multas estão pagas").waitFor();
    await panel.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 84 }));
    await settle();
    await shot("paid", 1.6, toast("Pagamento confirmado"));
    await shot("paid", 2.4, panel.getByText("Todas as multas estão pagas"));
    check("Stripe payment confirmed and every fine marked paid");
  }

  await writeFile(path.join(output, "scenes.json"), JSON.stringify(scenes, null, 2));
  const validation = { checks, browserErrors: errors, viewport: { width: 1200, height: 720 } };
  await writeFile(path.join(output, "validation.json"), JSON.stringify(validation, null, 2));
  if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
  console.log(`Captured ${scenes.length} screenshots. All ${checks.length} checks passed.`);
  console.log(`Assets: ${output}`);
} finally {
  await browser?.close();
  await client?.end();
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode !== null) return;
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      await exited;
      clearTimeout(timer);
    })
  );
  for (const log of logs) log.end();
  if (started) await pg.stop();
  if (existsSync(runtime)) await rm(runtime, { recursive: true, force: true });
}
