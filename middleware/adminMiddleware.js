const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * 🔒 Admin/Owner Protection Middleware
 * Verifies the admin token and ensures the user has a staff role.
 */
const adminProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Search ONLY the Staff/User collection
      const user = await User.findById(decoded.id || decoded._id).select("-password");

      if (!user) {
        return res.status(401).json({ error: "Admin account not found" });
      }

      // Check for authorized roles
      if (user.role !== 'admin' && user.role !== 'owner') {
        return res.status(403).json({ error: "Access denied: Staff privileges required" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Admin Auth Error:", error);
      return res.status(401).json({ error: "Not authorized, session expired" });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no admin token" });
  }
};

module.exports = adminProtect;