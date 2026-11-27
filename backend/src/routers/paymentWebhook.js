const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment");
const controller = new PaymentController();
// Stripe signs the exact bytes it sends, so this route reads the raw body and is
// mounted before express.json() and the JWT middleware.
router.post("/payment/webhook", express.raw({ type: "application/json" }), controller.webhook);
module.exports = router;
