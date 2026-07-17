const jwt = require("jsonwebtoken");

process.env.SECRET_KEY = "unit-test-secret";

const authMiddleware = require("../../src/middleware/auth");

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("auth middleware", () => {
  test("rejects requests without a token", () => {
    const request = { headers: {} };
    const response = createResponse();
    const next = jest.fn();

    authMiddleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      message: "Authentication token is required.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts a valid Bearer token", () => {
    const token = jwt.sign({ userLogin: "admin" }, process.env.SECRET_KEY);
    const request = { headers: { authorization: `Bearer ${token}` } };
    const response = createResponse();
    const next = jest.fn();

    authMiddleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(request.session.userLogin).toBe("admin");
    expect(response.status).not.toHaveBeenCalled();
  });

  test("rejects an invalid token", () => {
    const request = { headers: { authorization: "Bearer invalid-token" } };
    const response = createResponse();
    const next = jest.fn();

    authMiddleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
