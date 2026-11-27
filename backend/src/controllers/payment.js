const ServicePayment = require("../services/payment");
const sendError = require("../utils/sendError");
const HttpError = require("../utils/httpError");

const service = new ServicePayment();

// Where Stripe sends the reader back. APP_URL wins; otherwise the request's own
// origin is used, but only when it is one of the origins allowed by CORS.
function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const origin = req.get("origin");
  const allowed = (process.env.CORS_ORIGIN ?? "").split(",").map((value) => value.trim());
  if (origin && allowed.includes(origin)) return origin;
  throw new HttpError(503, "APP_URL is not configured.");
}

class ControllerPayment {
  async getFines(req, res) {
    try {
      res.status(200).json(await service.getFines(req.params.cpf));
    } catch (error) {
      sendError(res, error);
    }
  }

  async checkout(req, res) {
    try {
      const result = await service.createCheckout(req.body.cpfUser, () => appUrl(req));
      res.status(201).json({ message: "Checkout session created.", result });
    } catch (error) {
      sendError(res, error);
    }
  }

  async confirm(req, res) {
    try {
      res.status(200).json(await service.confirm(req.params.sessionId, req.session));
    } catch (error) {
      sendError(res, error);
    }
  }

  async webhook(req, res) {
    try {
      res.status(200).json(await service.handleWebhook(req.body, req.get("stripe-signature")));
    } catch (error) {
      sendError(res, error);
    }
  }
}

module.exports = ControllerPayment;
module.exports.appUrl = appUrl;
