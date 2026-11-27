// An error that carries its own HTTP status; sendError answers with it as is.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

module.exports = HttpError;
