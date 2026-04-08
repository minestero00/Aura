import { createServer } from "node:http";
import { config } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();
const server = createServer(app);

server.listen(config.port, () => {
  console.log(JSON.stringify({
    level: "info",
    service: "aura-back",
    message: "Aura backend listening",
    url: `http://localhost:${config.port}`,
    env: config.nodeEnv
  }));
});
