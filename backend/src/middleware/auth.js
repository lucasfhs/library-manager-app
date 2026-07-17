const jwt = require("jsonwebtoken");
require("dotenv").config();

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : authorization;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication token is required." });
  }

  jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .json({ message: "Authentication token is invalid." });
    }

    req.session = decoded;
    return next();
  });
}

module.exports = authMiddleware;
