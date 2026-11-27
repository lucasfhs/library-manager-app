const Stripe = require("stripe");
const HttpError = require("../utils/httpError");

let client;

// The Stripe client is created on first use so the API still starts, and every
// other route keeps working, when payments are not configured.
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "Payments are not configured.");
  client ??= new Stripe(key);
  return client;
}

module.exports = { getStripe };
