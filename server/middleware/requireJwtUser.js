import jwt from "jsonwebtoken";

export const requireJwtUser = async (req, res, next) => {
  const header = req.header("authorization");

  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }

  const token = header.slice("bearer ".length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ error: "Server misconfigured (JWT_SECRET missing)" });
  }

  try {
    const payload = jwt.verify(token, secret);
    // payload shape is controlled by our auth route
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
