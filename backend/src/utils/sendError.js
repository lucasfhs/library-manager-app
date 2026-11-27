// Maps errors from repositories and PostgreSQL to HTTP responses so clients
// can tell a broken rule from a server failure.
const HttpError = require("./httpError");

const pgStatus = {
  23505: 409, // unique_violation
  23503: 409, // foreign_key_violation
  23514: 422, // check_violation
  23502: 400, // not_null_violation
  P0001: 422, // raise_exception from a business-rule trigger
  "22P02": 400, // invalid_text_representation
  22001: 400, // string_data_right_truncation
  22007: 400, // invalid_datetime_format
  22008: 400, // datetime_field_overflow
};

function statusFor(error) {
  if (error instanceof HttpError) return error.status;
  if (error?.code && pgStatus[error.code]) return pgStatus[error.code];
  const message = String(error?.message ?? "");
  if (/cannot be null/i.test(message)) return 400;
  if (/not exists|does not exist|not found/i.test(message)) return 404;
  return 500;
}

function sendError(res, error) {
  const status = statusFor(error);
  if (status >= 500 && !(error instanceof HttpError)) {
    console.error(error);
    return res.status(status).json({ message: "Internal server error." });
  }
  return res.status(status).json({ message: error.message });
}

module.exports = sendError;
module.exports.statusFor = statusFor;
