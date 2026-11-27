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

test("library stock can be set to zero", async () => {
  const token = jwt.sign({ userLogin: "integration-test" }, process.env.SECRET_KEY);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const original = await (await fetch(`${baseUrl}/bookLibrary/6`, { headers })).json();

  const response = await fetch(`${baseUrl}/bookLibrary/6`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ idBook: original.idLivro, idLibrary: original.idBiblioteca, amount: 0 }),
  });
  expect(response.status).toBe(200);
  expect((await response.json()).result.quantidadeDisponivel).toBe(0);

  await fetch(`${baseUrl}/bookLibrary/6`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      idBook: original.idLivro,
      idLibrary: original.idBiblioteca,
      amount: original.quantidadeDisponivel,
    }),
  });
});

test("books by category lists each category once", async () => {
  const token = jwt.sign({ userLogin: "integration-test" }, process.env.SECRET_KEY);
  const response = await fetch(`${baseUrl}/report/getBooksByCategory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  const names = body.map((row) => row.categoria);

  expect(response.status).toBe(200);
  expect(new Set(names).size).toBe(names.length);
  expect(body.find((row) => row.categoria === "Ficção").quantidade_livros).toBe("5");
});

describe("operator registration", () => {
  const original = process.env.OPERATOR_REGISTRATION_KEY;
  afterEach(() => {
    process.env.OPERATOR_REGISTRATION_KEY = original;
  });

  test("is disabled without a configured key", async () => {
    delete process.env.OPERATOR_REGISTRATION_KEY;
    const response = await post("/auth", { userLogin: "x", password: "y", secretKey: "" });
    expect(response.status).toBe(403);
  });

  test("rejects a wrong key", async () => {
    process.env.OPERATOR_REGISTRATION_KEY = "correct-key";
    const response = await post("/auth", { userLogin: "x", password: "y", secretKey: "wrong" });
    expect(response.status).toBe(403);
  });
});

describe("error statuses", () => {
  const token = () => jwt.sign({ userLogin: "integration-test" }, process.env.SECRET_KEY);

  test("missing records answer 404", async () => {
    const response = await fetch(`${baseUrl}/book/999999`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    expect(response.status).toBe(404);
  });

  test("duplicate titles answer 409", async () => {
    const response = await post(
      "/book",
      { title: "Fundação", author: "Isaac Asimov", category: ["Ficção"], pages: 1, price: 1, language: "Português" },
      token()
    );
    expect(response.status).toBe(409);
  });

  test("loan rules enforced by triggers answer 422 with their message", async () => {
    // Ana Júlia has loans open for more than 30 days in the seed data.
    const response = await post(
      "/loan",
      { cpfUser: "23611482005", idBook: 5, idLibrary: 4, dateLoan: "2026-01-10", dateReturn: null },
      token()
    );
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.message).toMatch(/atrasados/);
  });

  test("missing fields answer 400", async () => {
    const response = await post("/book", { title: "Sem autor" }, token());
    expect(response.status).toBe(400);
  });
});

describe("late-fee payments", () => {
  const ana = "23611482005";
  const readerToken = (cpfUser) => jwt.sign({ cpfUser, role: "reader" }, process.env.SECRET_KEY);
  const get = (path, token) => fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  test("fines accrue R$ 1,00 per late day, capped at the book price", async () => {
    const response = await get(`/payment/fines/${ana}`, readerToken(ana));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.finePerDayCents).toBe(100);
    expect(body.loans.map((loan) => loan.loanId)).toEqual([1, 26, 27, 28, 16, 24, 25]);
    // Returned 12 and 30 days late; the others reach their book's price.
    expect(body.loans.map((loan) => loan.fineCents)).toEqual([4290, 1200, 3000, 1090, 4290, 5990, 4500]);
    expect(body.loans.find((loan) => loan.loanId === 26)).toMatchObject({ daysLate: 12, dueCents: 1200 });
    expect(body.totalDueCents).toBe(24360);
  });

  test("a confirmed payment settles the fine", async () => {
    await database.query(
      `INSERT INTO pagamento_multa (id_emprestimo, cpf_usuario, stripe_session_id, valor_centavos, status, pago_em)
       VALUES (1, $1, 'cs_integration_test', 4290, 'pago', now())`,
      [ana]
    );
    try {
      const body = await (await get(`/payment/fines/${ana}`, readerToken(ana))).json();
      expect(body.loans[0]).toMatchObject({ loanId: 1, paidCents: 4290, dueCents: 0 });
      expect(body.totalDueCents).toBe(24360 - 4290);
    } finally {
      await database.query("DELETE FROM pagamento_multa WHERE stripe_session_id = 'cs_integration_test'");
    }
  });

  test("readers cannot see another reader's fines", async () => {
    const response = await get(`/payment/fines/${ana}`, readerToken("32168781044"));
    expect(response.status).toBe(403);
  });

  test("checkout answers 503 while Stripe is not configured", async () => {
    const previous = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const response = await post("/payment/checkout", { cpfUser: ana }, readerToken(ana));
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ message: "Payments are not configured." });
    } finally {
      if (previous) process.env.STRIPE_SECRET_KEY = previous;
    }
  });

  test("the webhook is public but needs a valid Stripe signature", async () => {
    const previous = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_integration";
    process.env.STRIPE_SECRET_KEY ||= "sk_test_integration";
    try {
      const response = await fetch(`${baseUrl}/payment/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=bad" },
        body: JSON.stringify({ type: "checkout.session.completed" }),
      });
      expect(response.status).toBe(400);
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = previous ?? "";
    }
  });
});
