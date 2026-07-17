const express = require("express");
const cors = require("cors");

const database = require("./config/database");
const authMiddleware = require("./middleware/auth");
const apiRegisterAuthRouter = require("./routers/apiUserRegister_Auth");
const userRegisterRouter = require("./routers/userRegister");
const apiUserRouter = require("./routers/apiUser");
const userRouter = require("./routers/user");
const bookRouter = require("./routers/book");
const libraryRouter = require("./routers/library");
const bookLibraryRouter = require("./routers/bookLibrary");
const loanRouter = require("./routers/loan");
const reportRouter = require("./routers/report");

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await database.query("SELECT 1");
    return res.status(200).json({ status: "ok", database: "connected" });
  } catch (_error) {
    return res
      .status(503)
      .json({ status: "unavailable", database: "disconnected" });
  }
});

app.use(apiRegisterAuthRouter);
app.use(userRegisterRouter);
app.use(authMiddleware);
app.use(apiUserRouter);
app.use(userRouter);
app.use(bookRouter);
app.use(libraryRouter);
app.use(bookLibraryRouter);
app.use(loanRouter);
app.use(reportRouter);

app.use((_req, res) =>
  res.status(404).json({ message: "Route not found." })
);

module.exports = app;
