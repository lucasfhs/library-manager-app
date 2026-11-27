const ServicePayment = require("../../src/services/payment");
const HttpError = require("../../src/utils/httpError");

const cpfUser = "23611482005";
const loan = (loanId, dueCents, extra = {}) => ({
  loanId,
  book: `Livro ${loanId}`,
  library: "Biblioteca Central",
  daysLate: 40,
  fineCents: dueCents,
  paidCents: 0,
  dueCents,
  ...extra,
});

function setup({ fines = [loan(1, 4290), loan(2, 5990)], pending = [], rows = [] } = {}) {
  const repo = {
    findUser: jest.fn().mockResolvedValue({ cpf: cpfUser, email: "ana@example.com" }),
    finesByUser: jest.fn().mockResolvedValue(fines),
    pendingSessions: jest.fn().mockResolvedValue(pending),
    findBySession: jest.fn().mockResolvedValue(rows),
    createPending: jest.fn().mockResolvedValue(),
    markPaid: jest.fn().mockResolvedValue(1),
    markExpired: jest.fn().mockResolvedValue(1),
  };
  const stripe = {
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: "cs_new", url: "https://checkout.stripe.com/c/pay/cs_new", amount_total: 10280 }),
        retrieve: jest.fn(),
        expire: jest.fn().mockResolvedValue({}),
      },
    },
    webhooks: { constructEvent: jest.fn() },
  };
  const service = new ServicePayment({ stripe: () => stripe, repo });
  return { service, repo, stripe };
}

describe("payment service", () => {
  test("summarizes a reader's fines", async () => {
    const { service } = setup({ fines: [loan(1, 4290), loan(2, 0, { fineCents: 5990, paidCents: 5990 })] });
    const result = await service.getFines(cpfUser);
    expect(result).toMatchObject({ totalFineCents: 10280, totalPaidCents: 5990, totalDueCents: 4290, finePerDayCents: 100 });
  });

  test("creates a BRL Checkout Session with one line per unpaid fine", async () => {
    const { service, repo, stripe } = setup({ fines: [loan(1, 4290), loan(2, 0), loan(3, 5990)] });
    const result = await service.createCheckout(cpfUser, "http://localhost:8080");

    const params = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(params.mode).toBe("payment");
    expect(params.line_items).toHaveLength(2);
    expect(params.line_items[0].price_data).toMatchObject({ currency: "brl", unit_amount: 4290 });
    expect(params.success_url).toBe("http://localhost:8080/loan?payment=success&session_id={CHECKOUT_SESSION_ID}");
    expect(params.metadata).toEqual({ cpfUser });
    expect(repo.createPending).toHaveBeenCalledWith("cs_new", cpfUser, [
      { loanId: 1, amountCents: 4290 },
      { loanId: 3, amountCents: 5990 },
    ]);
    expect(result.url).toContain("checkout.stripe.com");
  });

  test("refuses a checkout when nothing is due", async () => {
    const { service, stripe } = setup({ fines: [loan(1, 0)] });
    await expect(service.createCheckout(cpfUser, "http://app")).rejects.toMatchObject({ status: 409 });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test("expires an open earlier session before opening a new one", async () => {
    const { service, repo, stripe } = setup({ pending: ["cs_old"] });
    stripe.checkout.sessions.retrieve.mockResolvedValue({ id: "cs_old", status: "open", payment_status: "unpaid" });
    await service.createCheckout(cpfUser, "http://app");
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_old");
    expect(repo.markExpired).toHaveBeenCalledWith("cs_old");
  });

  test("settles an earlier session that was already paid instead of charging again", async () => {
    const { service, repo, stripe } = setup({ pending: ["cs_old"], rows: [{ amountCents: 4290 }] });
    stripe.checkout.sessions.retrieve.mockResolvedValue({ id: "cs_old", status: "complete", payment_status: "paid", amount_total: 4290 });
    repo.finesByUser.mockResolvedValue([loan(1, 0)]);
    await expect(service.createCheckout(cpfUser, "http://app")).rejects.toMatchObject({ status: 409 });
    expect(repo.markPaid).toHaveBeenCalledWith("cs_old");
    expect(stripe.checkout.sessions.expire).not.toHaveBeenCalled();
  });

  test("confirm marks a paid session and rejects other readers", async () => {
    const rows = [{ cpfUser, amountCents: 4290 }, { cpfUser, amountCents: 5990 }];
    const { service, repo, stripe } = setup({ rows });
    stripe.checkout.sessions.retrieve.mockResolvedValue({ id: "cs_1", status: "complete", payment_status: "paid", amount_total: 10280 });

    await expect(service.confirm("cs_1", { cpfUser })).resolves.toEqual({ sessionId: "cs_1", status: "paid", amountCents: 10280 });
    expect(repo.markPaid).toHaveBeenCalledWith("cs_1");
    await expect(service.confirm("cs_1", { cpfUser: "32168781044" })).rejects.toMatchObject({ status: 403 });
  });

  test("does not mark a session whose amount differs from the recorded fines", async () => {
    const { service, repo, stripe } = setup({ rows: [{ cpfUser, amountCents: 4290 }] });
    stripe.checkout.sessions.retrieve.mockResolvedValue({ id: "cs_1", payment_status: "paid", amount_total: 100 });
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(service.confirm("cs_1", { cpfUser })).rejects.toMatchObject({ status: 409 });
    expect(repo.markPaid).not.toHaveBeenCalled();
    console.error.mockRestore();
  });

  test("confirm answers 404 for an unknown session", async () => {
    const { service } = setup({ rows: [] });
    await expect(service.confirm("cs_missing", { cpfUser })).rejects.toBeInstanceOf(HttpError);
  });

  describe("webhook", () => {
    const previous = process.env.STRIPE_WEBHOOK_SECRET;
    afterEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = previous;
    });

    test("needs a configured secret", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const { service } = setup();
      await expect(service.handleWebhook(Buffer.from("{}"), "sig")).rejects.toMatchObject({ status: 503 });
    });

    test("rejects a bad signature", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      const { service, stripe } = setup();
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("No signatures found");
      });
      await expect(service.handleWebhook(Buffer.from("{}"), "bad")).rejects.toMatchObject({ status: 400 });
    });

    test("marks fines paid on checkout.session.completed and expired on expiry", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      const { service, repo, stripe } = setup({ rows: [{ cpfUser, amountCents: 4290 }] });
      stripe.webhooks.constructEvent
        .mockReturnValueOnce({ type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", amount_total: 4290 } } })
        .mockReturnValueOnce({ type: "checkout.session.expired", data: { object: { id: "cs_2", status: "expired", payment_status: "unpaid" } } });
      await service.handleWebhook(Buffer.from("{}"), "sig");
      await service.handleWebhook(Buffer.from("{}"), "sig");
      expect(repo.markPaid).toHaveBeenCalledWith("cs_1");
      expect(repo.markExpired).toHaveBeenCalledWith("cs_2");
    });
  });
});
