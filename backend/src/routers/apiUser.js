const express = require("express");
const router = express.Router();
const ApiUserController = require("../controllers/apiUser");
const controller = new ApiUserController();

router.get("/auth/:userLogin", controller.get);
router.delete("/auth/:userLogin", controller.delete);
router.put("/auth/:userLogin", controller.update);

module.exports = router;
