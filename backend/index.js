require("dotenv").config();

const app = require("./src/app");
const database = require("./src/config/database");

const port = Number(process.env.PORT || 3000);

async function waitForDatabase(maxAttempts = 15) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await database.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      console.log(`Database unavailable (attempt ${attempt}/${maxAttempts}); retrying`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function start() {
  await waitForDatabase();

  const server = app.listen(port, () => {
    console.log(`Library Manager API listening on port ${port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await database.end();
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((error) => {
  console.error("Unable to start the API:", error);
  process.exit(1);
});
