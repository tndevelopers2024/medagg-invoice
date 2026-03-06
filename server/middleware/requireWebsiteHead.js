export const requireWebsiteHead = async (req, res, next) => {
  if (!req.user || req.user.role !== "website_head") {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};
