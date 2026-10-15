import fs from "node:fs";
import { loadEnv } from "./config.js";
import { createApp } from "./app.js";

const env = loadEnv();

if (env.nodeEnv === "production") {
  fs.mkdirSync(env.sessionStorePath, { recursive: true });
}

const { app } = createApp(env);

app.listen(env.port, () => {
  console.log(`Command Center listening on port ${env.port}`);
});
