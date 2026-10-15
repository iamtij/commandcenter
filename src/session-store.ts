import session from "express-session";
import createFileStore from "session-file-store";
import type { AppEnv } from "./config.js";

const FileStore = createFileStore(session);

export function createSessionMiddleware(env: AppEnv) {
  const options: session.SessionOptions = {
    name: "cc.sid",
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  if (env.nodeEnv === "production") {
    options.store = new FileStore({
      path: env.sessionStorePath,
      secret: env.sessionSecret,
      ttl: 7 * 24 * 60 * 60,
      logFn: () => {},
    });
  }

  return session(options);
}
