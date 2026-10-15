import type { RequestHandler } from "express";
import type { AppEnv } from "../config.js";

export function createSecurityHeaders(env: AppEnv): RequestHandler {
  const csp =
    "default-src 'self'; script-src 'none'; style-src 'self'; frame-ancestors 'none'";

  return (_req, res, next) => {
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", csp);

    if (env.nodeEnv === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }

    next();
  };
}
