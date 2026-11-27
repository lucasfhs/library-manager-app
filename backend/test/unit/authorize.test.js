const authorize = require("../../src/middleware/authorize");
const { roleOf } = require("../../src/middleware/authorize");

function run(session, method, path, body) {
  const request = { session, method, path, body };
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  authorize(request, response, next);
  return { allowed: next.mock.calls.length === 1, response };
}

const reader = { cpfUser: "32168781044", role: "reader" };

describe("authorize middleware", () => {
  test("derives roles from the token payload", () => {
    expect(roleOf({ userLogin: "admin" })).toBe("operator");
    expect(roleOf(reader)).toBe("reader");
    expect(roleOf({})).toBeNull();
  });

  test("operators may call any protected route", () => {
    expect(run({ userLogin: "admin" }, "DELETE", "/book/1").allowed).toBe(true);
    expect(run({ userLogin: "admin" }, "GET", "/user").allowed).toBe(true);
  });

  test("readers may browse the catalog", () => {
    expect(run(reader, "GET", "/report/getBookCatalog").allowed).toBe(true);
    expect(run(reader, "GET", "/report/getBookAvailability/3").allowed).toBe(true);
    expect(run(reader, "GET", "/book/3").allowed).toBe(true);
  });

  test("readers only reach their own profile and loans", () => {
    expect(run(reader, "GET", "/user/32168781044").allowed).toBe(true);
    expect(run(reader, "GET", "/report/getUserLoans/32168781044").allowed).toBe(true);
    expect(run(reader, "GET", "/user/90202975037").allowed).toBe(false);
    expect(run(reader, "GET", "/report/getUserLoans/90202975037").allowed).toBe(false);
  });

  test("readers may only borrow in their own name", () => {
    expect(run(reader, "POST", "/loan", { cpfUser: "32168781044" }).allowed).toBe(true);
    expect(run(reader, "POST", "/loan", { cpfUser: "90202975037" }).allowed).toBe(false);
  });

  test("readers cannot change the catalog or list users", () => {
    const { allowed, response } = run(reader, "POST", "/book", {});
    expect(allowed).toBe(false);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(run(reader, "PUT", "/bookLibrary/1").allowed).toBe(false);
    expect(run(reader, "GET", "/user").allowed).toBe(false);
    expect(run(reader, "GET", "/loan").allowed).toBe(false);
  });

  test("tokens without a known identity are refused", () => {
    expect(run({}, "GET", "/book").allowed).toBe(false);
  });
  test("readers only see and pay their own fines", () => {
    expect(run(reader, "GET", "/payment/fines/32168781044").allowed).toBe(true);
    expect(run(reader, "GET", "/payment/fines/90202975037").allowed).toBe(false);
    expect(run(reader, "POST", "/payment/checkout", { cpfUser: "32168781044" }).allowed).toBe(true);
    expect(run(reader, "POST", "/payment/checkout", { cpfUser: "90202975037" }).allowed).toBe(false);
    expect(run(reader, "POST", "/payment/confirm/cs_test_a1B2").allowed).toBe(true);
  });
});
