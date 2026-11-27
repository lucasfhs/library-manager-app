const ServiceBookLibrary = require("../services/bookLibrary");
const sendError = require("../utils/sendError");
const service = new ServiceBookLibrary();
class ControllerBookLibrary {
  async get(req, res) {
    try {
      const id = req.params.id;
      const bookLibrary = await service.get(id);
      res.status(200).json(bookLibrary);
    } catch (error) {
      sendError(res, error);
    }
  }
  async getAll(req, res) {
    try {
      const bookLibrary = await service.getAll();
      res.status(200).json(bookLibrary);
    } catch (error) {
      sendError(res, error);
    }
  }
  async put(req, res) {
    try {
      const id = req.params.id;
      const { idBook, idLibrary, amount } = req.body;
      const result = await service.put(id, idBook, idLibrary, amount);
      res.status(200).json({
        message: "Book Library relationship updated successfully.",
        result,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
  async post(req, res) {
    try {
      const { idBook, idLibrary, amount } = req.body;
      const result = await service.post(idBook, idLibrary, amount);
      res.status(201).json({
        message: "The Book Library relationship has been created successfully.",
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
      res.status(200).json({
        message: "Book Library relationship deleted successfully.",
        result,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

module.exports = ControllerBookLibrary;
