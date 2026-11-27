const client = require("../config/database");

// Fine amounts are computed by the multa_emprestimo view (see init.sql) and kept
// in cents so no rounding happens in JavaScript.
const FINE_COLUMNS = `
  id_emprestimo AS "loanId",
  livro AS "book",
  biblioteca AS "library",
  data_emprestimo AS "loanDate",
  data_limite AS "dueDate",
  data_devolucao AS "returnDate",
  dias_atraso AS "daysLate",
  multa_centavos AS "fineCents",
  pago_centavos AS "paidCents",
  multa_centavos - pago_centavos AS "dueCents"
`;

class Payment {
  /** Every loan of the reader that has accrued a fine, paid or not. */
  static async finesByUser(cpfUsuario) {
    const result = await client.query(
      `SELECT ${FINE_COLUMNS}
       FROM multa_emprestimo
       WHERE cpf_usuario = $1 AND multa_centavos > 0
       ORDER BY data_emprestimo, id_emprestimo;`,
      [cpfUsuario]
    );
    return result.rows;
  }

  static async pendingSessions(cpfUsuario) {
    const result = await client.query(
      `SELECT DISTINCT stripe_session_id AS "sessionId"
       FROM pagamento_multa
       WHERE cpf_usuario = $1 AND status = 'pendente';`,
      [cpfUsuario]
    );
    return result.rows.map((row) => row.sessionId);
  }

  static async findBySession(sessionId) {
    const result = await client.query(
      `SELECT id_emprestimo AS "loanId", cpf_usuario AS "cpfUser",
              valor_centavos AS "amountCents", status, pago_em AS "paidAt"
       FROM pagamento_multa
       WHERE stripe_session_id = $1
       ORDER BY id_emprestimo;`,
      [sessionId]
    );
    return result.rows;
  }

  /** Records the loans a Checkout Session pays for, in one transaction. */
  static async createPending(sessionId, cpfUsuario, items) {
    const connection = await client.connect();
    try {
      await connection.query("BEGIN");
      for (const item of items) {
        await connection.query(
          `INSERT INTO pagamento_multa (id_emprestimo, cpf_usuario, stripe_session_id, valor_centavos)
           VALUES ($1, $2, $3, $4);`,
          [item.loanId, cpfUsuario, sessionId, item.amountCents]
        );
      }
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  }

  static async markPaid(sessionId) {
    const result = await client.query(
      `UPDATE pagamento_multa
       SET status = 'pago', pago_em = now()
       WHERE stripe_session_id = $1 AND status <> 'pago'
       RETURNING id_emprestimo;`,
      [sessionId]
    );
    return result.rowCount;
  }

  static async markExpired(sessionId) {
    const result = await client.query(
      `UPDATE pagamento_multa
       SET status = 'expirado'
       WHERE stripe_session_id = $1 AND status = 'pendente';`,
      [sessionId]
    );
    return result.rowCount;
  }
}

module.exports = Payment;
