const Payment = require("../models/payment");
const User = require("../models/user");

class RepositoryPayment {
  async findUser(cpfUser) {
    if (!cpfUser) throw new Error("cpfUser cannot be null.");
    const user = await User.findByCPF(cpfUser);
    if (!user) throw new Error("User not exists.");
    return user;
  }

  async finesByUser(cpfUser) {
    if (!cpfUser) throw new Error("cpfUser cannot be null.");
    return Payment.finesByUser(cpfUser);
  }

  async pendingSessions(cpfUser) {
    return Payment.pendingSessions(cpfUser);
  }

  async findBySession(sessionId) {
    if (!sessionId) throw new Error("sessionId cannot be null.");
    return Payment.findBySession(sessionId);
  }

  async createPending(sessionId, cpfUser, items) {
    if (!sessionId) throw new Error("sessionId cannot be null.");
    if (!items?.length) throw new Error("items cannot be null.");
    return Payment.createPending(sessionId, cpfUser, items);
  }

  async markPaid(sessionId) {
    return Payment.markPaid(sessionId);
  }

  async markExpired(sessionId) {
    return Payment.markExpired(sessionId);
  }
}

module.exports = RepositoryPayment;
