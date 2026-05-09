import { createServer } from "node:http";
import { config } from "./config/env.js";
import { createApp } from "./app.js";
import { closeRedisClient } from "./lib/cache/redis.js";
import { authStore } from "./modules/auth/store.js";
import { hasEncryptionKey } from "./lib/security/encryption.js";

async function bootstrap() {
  if (!hasEncryptionKey() && config.nodeEnv === "production") {
    throw new Error(
      "APP_ENCRYPTION_KEY must be set in production. Provide a 64 char hex string or base64 of 32 bytes."
    );
  }

  if (!hasEncryptionKey()) {
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-back",
        message: "APP_ENCRYPTION_KEY is not set; provider tokens are stored as plain text."
      })
    );
  }

  await authStore.initialize();

  const app = createApp();
  const server = createServer(app);
  // Force-close any request that doesn't finish within 12s so a hung
  // downstream (DB, external API) cannot leak sockets after the client
  // already gave up. headersTimeout must be > requestTimeout per Node docs.
  server.requestTimeout = 12_000;
  server.headersTimeout = 13_000;

  async function shutdown(signal: string) {
    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-back",
        message: "shutdown requested",
        signal
      })
    );

    server.close(async () => {
      await Promise.all([
        authStore.close(),
        closeRedisClient()
      ]);
      process.exit(0);
    });
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  server.listen(config.port, () => {
    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-back",
        message: "Aura backend listening",
        url: `http://localhost:${config.port}`,
        env: config.nodeEnv
      })
    );
  });
}

void bootstrap().catch(error => {
  console.error(error);
  process.exit(1);
});
