require("dotenv").config({ quiet: true });
const { Pool, types } = require("pg");

// Return DATE columns as "YYYY-MM-DD" strings. The default conversion to a
// JavaScript Date at local midnight shifts the day when serialized in a
// timezone ahead of UTC.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
