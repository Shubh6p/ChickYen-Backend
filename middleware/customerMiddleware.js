const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

/**
 * 🔐 Customer Protection Middleware
 * Verifies the customerToken and attaches the customer to the request.
 */
const customerProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Extract user ID using consistent naming conventions
      const customer = await Customer.findById(decoded._id || decoded.id).select("-password");

      if (!customer) {
        return res.status(401).json({ error: "Customer account not found" });
      }

      req.user = customer;
      next();
    } catch (error) {
      console.error("Customer Auth Error:", error);
      return res.status(401).json({ error: "Not authorized, please login again" });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, no customer token" });
  }
};

module.exports = customerProtect;