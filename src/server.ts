import { loadEnv } from "./config.js";
import { createApp } from "./app.js";

const env = loadEnv();
const { app } = createApp(env);

app.listen(env.port, () => {
  console.log(`Command Center listening on port ${env.port}`);
});
