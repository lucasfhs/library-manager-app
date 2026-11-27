const jwt = require("jsonwebtoken");

process.env.SECRET_KEY = process.env.SECRET_KEY || "integration-test-secret";

const app = require("../../src/app");
const database = require("../../src/config/database");

let server;
let baseUrl;

beforeAll(async () => {
  await database.query("SELECT 1");
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await database.end();
});

test("health endpoint confirms the database connection", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual({ status: "ok", database: "connected" });
});

test("protected endpoints reject anonymous requests", async () => {
  const response = await fetch(`${baseUrl}/report/getBookCatalog`);

  expect(response.status).toBe(401);
});

test("authenticated catalog request returns seeded books", async () => {
  const token = jwt.sign({ userLogin: "integration-test" }, process.env.SECRET_KEY);
  const response = await fetch(`${baseUrl}/report/getBookCatalog`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeGreaterThan(0);
  expect(body[0]).toHaveProperty("img_url");
});

async function post(path, body, token) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("operator login issues a token with the operator role", async () => {
  const response = await post("/auth/loginAdmin", { userLogin: "admin", password: "admin" });
  const body = await response.json();

  expect(response.status).toBe(200);
  const payload = jwt.verify(body.result, process.env.SECRET_KEY);
  expect(payload).toMatchObject({ userLogin: "admin", role: "operator" });
  expect(payload).not.toHaveProperty("password");
});

test("invalid credentials answer 401", async () => {
  const response = await post("/auth/loginAdmin", { userLogin: "admin", password: "wrong" });

  expect(response.status).toBe(401);
});

describe("reader session", () => {
  const cpf = "32168781044";
  let token;

  beforeAll(async () => {
    const response = await post("/auth/loginUser", { cpfUser: cpf, password: "1234" });
    expect(response.status).toBe(200);
    token = (await response.json()).result;
  });

  test("reads its own profile without the password", async () => {
    const response = await fetch(`${baseUrl}/user/${cpf}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cpf).toBe(cpf);
    expect(body).not.toHaveProperty("senha");
  });

  test("cannot change the catalog", async () => {
    const response = await post(
      "/book",
      { title: "x", author: "y", category: ["Romance"], pages: 1, price: 1, language: "Português" },
      token
    );

    expect(response.status).toBe(403);
  });
});

test("library addresses keep street names that contain commas", async () => {
  const token = jwt.sign({ userLogin: "integration-test" }, process.env.SECRET_KEY);
  const response = await fetch(`${baseUrl}/library/1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.endereco).toEqual({
    rua: "Av. Brasil, 500",
    bairro: "Centro",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    pais: "Brasil",
    cep: "20040-000",
  });
});

test("loan dates are serialized as calendar dates", async () => {
  const token = jwt.sign({ userLogin: "integration-test" }, process.env.SECRET_KEY);
  const response = await fetch(`${baseUrl}/loan/2`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.dataEmprestimo).toBe("2024-01-01");
  expect(body.dataDevolucao).toBe("2024-01-10");
});
