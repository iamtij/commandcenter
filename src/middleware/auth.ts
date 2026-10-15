import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.session.user) {
    next();
    return;
  }

  const acceptsHtml = req.headers.accept?.includes("text/html") ?? false;

  if (req.method === "GET" && acceptsHtml && !req.path.startsWith("/api")) {
    res.redirect("/auth/google");
    return;
  }

  res.status(401).send("Unauthorized");
};
