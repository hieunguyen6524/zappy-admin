// Simple admin token middleware
export const requireAdmin = (req, res, next) => {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return res.status(500).json({ error: "Server not configured: ADMIN_API_TOKEN missing" });
  }
  if (!token || token !== adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

