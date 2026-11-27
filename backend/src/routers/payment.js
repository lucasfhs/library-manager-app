const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment");
const controller = new PaymentController();
router.get("/payment/fines/:cpf", controller.getFines);
router.post("/payment/checkout", controller.checkout);
router.post("/payment/confirm/:sessionId", controller.confirm);
module.exports = router;
