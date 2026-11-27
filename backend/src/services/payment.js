const RepositoryPayment = require("../repositories/payment");
const { getStripe } = require("../config/stripe");
const HttpError = require("../utils/httpError");

const repository = new RepositoryPayment();

const FINE_PER_DAY_CENTS = 100;
// Stripe's minimum; a Checkout Session must stay open at least 30 minutes.
const SESSION_LIFETIME_SECONDS = 30 * 60;

function summarize(cpfUser, loans) {
  return {
    cpfUser,
    finePerDayCents: FINE_PER_DAY_CENTS,
    totalFineCents: loans.reduce((sum, loan) => sum + loan.fineCents, 0),
    totalPaidCents: loans.reduce((sum, loan) => sum + loan.paidCents, 0),
    totalDueCents: loans.reduce((sum, loan) => sum + loan.dueCents, 0),
    loans,
  };
}

class ServicePayment {
  constructor({ stripe = getStripe, repo = repository } = {}) {
    this.stripe = stripe;
    this.repo = repo;
  }

  async getFines(cpfUser) {
    await this.repo.findUser(cpfUser);
    return summarize(cpfUser, await this.repo.finesByUser(cpfUser));
  }

  /**
   * Opens a Stripe Checkout Session for every unpaid fine of the reader. Earlier
   * sessions still open are settled or expired first, so a reader can never pay
   * the same fine twice.
   */
  async createCheckout(cpfUser, resolveAppUrl) {
    const stripe = this.stripe();
    const appUrl = typeof resolveAppUrl === "function" ? resolveAppUrl() : resolveAppUrl;
    const user = await this.repo.findUser(cpfUser);

    for (const sessionId of await this.repo.pendingSessions(cpfUser)) {
      const previous = await stripe.checkout.sessions.retrieve(sessionId);
      if (previous.status === "open") {
        await stripe.checkout.sessions.expire(sessionId);
        await this.repo.markExpired(sessionId);
      } else {
        await this.sync(previous);
      }
    }

    const due = (await this.repo.finesByUser(cpfUser)).filter((loan) => loan.dueCents > 0);
    if (due.length === 0) throw new HttpError(409, "There are no fines to pay.");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "pt-BR",
      client_reference_id: cpfUser,
      customer_email: user.email || undefined,
      metadata: { cpfUser },
      payment_intent_data: { metadata: { cpfUser } },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
      line_items: due.map((loan) => ({
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: loan.dueCents,
          product_data: {
            name: `Multa por atraso — ${loan.book}`,
            description: `${loan.daysLate} dias de atraso · ${loan.library}`,
          },
        },
      })),
      success_url: `${appUrl}/loan?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/loan?payment=cancelled`,
    });

    await this.repo.createPending(
      session.id,
      cpfUser,
      due.map((loan) => ({ loanId: loan.loanId, amountCents: loan.dueCents }))
    );
    return { sessionId: session.id, url: session.url, amountCents: session.amount_total };
  }

  /** Called by the success page; reconciles with Stripe in case the webhook is late or absent. */
  async confirm(sessionId, requester = {}) {
    const rows = await this.repo.findBySession(sessionId);
    if (rows.length === 0) throw new HttpError(404, "Payment not found.");
    if (requester.cpfUser && rows[0].cpfUser.trim() !== requester.cpfUser) {
      throw new HttpError(403, "You do not have permission to access this resource.");
    }
    const session = await this.stripe().checkout.sessions.retrieve(sessionId);
    const status = await this.sync(session);
    return {
      sessionId,
      status,
      amountCents: rows.reduce((sum, row) => sum + row.amountCents, 0),
    };
  }

  /** Mirrors a Checkout Session's outcome into pagamento_multa. */
  async sync(session) {
    if (session.payment_status === "paid") {
      const rows = await this.repo.findBySession(session.id);
      const expected = rows.reduce((sum, row) => sum + row.amountCents, 0);
      if (rows.length && session.amount_total !== expected) {
        console.error(`Stripe session ${session.id}: paid ${session.amount_total}, expected ${expected}`);
        throw new HttpError(409, "The paid amount does not match the fines.");
      }
      await this.repo.markPaid(session.id);
      return "paid";
    }
    if (session.status === "expired") {
      await this.repo.markExpired(session.id);
      return "expired";
    }
    return "pending";
  }

  async handleWebhook(rawBody, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(503, "Payment webhooks are not configured.");
    let event;
    try {
      event = this.stripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch (_error) {
      throw new HttpError(400, "Invalid webhook signature.");
    }
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.expired",
      ].includes(event.type)
    ) {
      await this.sync(event.data.object);
    }
    return { received: true };
  }
}

module.exports = ServicePayment;
module.exports.FINE_PER_DAY_CENTS = FINE_PER_DAY_CENTS;
