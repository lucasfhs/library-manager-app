const sendError = require("../../src/utils/sendError");
const { statusFor } = require("../../src/utils/sendError");

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

test.each([
  [{ code: "23505", message: "duplicate key" }, 409],
  [{ code: "23503", message: "foreign key" }, 409],
  [{ code: "23514", message: "check" }, 422],
  [{ code: "P0001", message: "Limite de empréstimos atingido para o usuário." }, 422],
  [{ code: "22P02", message: "invalid input syntax" }, 400],
  [new Error("Title cannot be null."), 400],
  [new Error("Book not exists."), 404],
  [new Error("connection terminated"), 500],
  [new (require("../../src/utils/httpError"))(503, "Payments are not configured."), 503],
])("maps %o to %i", (error, status) => {
  expect(statusFor(error)).toBe(status);
});

test("keeps rule messages for client errors", () => {
  const res = response();
  sendError(res, { code: "P0001", message: "Usuário já pegou este livro e ainda não devolveu!" });
  expect(res.status).toHaveBeenCalledWith(422);
  expect(res.json).toHaveBeenCalledWith({ message: "Usuário já pegou este livro e ainda não devolveu!" });
});

test("hides internal details on server errors", () => {
  const res = response();
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  sendError(res, new Error("password authentication failed for user x"));
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ message: "Internal server error." });
  spy.mockRestore();
});
