// Records loaded for authentication carry `senha`; never send it to clients.
function withoutPassword(record) {
  if (Array.isArray(record)) return record.map(withoutPassword);
  if (!record || typeof record !== "object") return record;
  const { senha: _senha, ...rest } = record;
  return rest;
}

module.exports = withoutPassword;
