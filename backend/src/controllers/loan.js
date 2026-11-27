const ServiceLoan = require("../services/loan");
const sendError = require("../utils/sendError");
const service = new ServiceLoan();
class ControllerLoan {
  async get(req, res) {
    try {
      const id = req.params.id;
      const loan = await service.get(id);
      res.status(200).json(loan);
    } catch (error) {
      sendError(res, error);
    }
  }
  async getAll(req, res) {
    try {
      const loan = await service.getAll();
      res.status(200).json(loan);
    } catch (error) {
      sendError(res, error);
    }
  }
  async put(req, res) {
    try {
      const id = req.params.id;
      const { cpfUser, idBook, dateLoan, dateReturn, idLibrary } = req.body;
      const result = await service.put(
        id,
        cpfUser,
        idBook,
        dateLoan,
        dateReturn,
        idLibrary
      );
      res.status(200).json({ message: "Loan updated successfully.", result });
    } catch (error) {
      sendError(res, error);
    }
  }
  async post(req, res) {
    try {
      const { cpfUser, idBook, dateLoan, dateReturn, idLibrary } = req.body;
      const result = await service.post(
        cpfUser,
        idBook,
        dateLoan,
        dateReturn,
        idLibrary
      );
      res.status(201).json({
        message: "The Loan has been created successfully.",
        result,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
  async delete(req, res) {
    try {
      const id = req.params.id;
      const result = await service.delete(id);
      res.status(200).json({ message: "Loan deleted successfully.", result });
    } catch (error) {
      sendError(res, error);
    }
  }
}

module.exports = ControllerLoan;
