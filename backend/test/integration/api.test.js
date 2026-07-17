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
