const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const adminProtect = require("../middleware/adminMiddleware"); // Using new admin guard

const router = express.Router();

// SIGNUP
router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const exists = await Customer.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const customer = await Customer.create({ email, password: hashed });
    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: "Signup failed" });
  }
});

// LOGIN (Standardized to _id)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const customer = await Customer.findOne({ email });
    if (!customer) return res.status(404).json({ error: "Email not found" });

    const match = await bcrypt.compare(password, customer.password);
    if (!match) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ _id: customer._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      customer: { _id: customer._id, email: customer.email, name: customer.name }
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// UPDATE DETAILS
router.put("/details", async (req, res) => {
  const { name, phone, address } = req.body;
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id; 
    const updated = await Customer.findByIdAndUpdate(userId, { name, phone, address }, { new: true }).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// GET DETAILS
router.get("/details", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id; 
    const customer = await Customer.findById(userId).select("-password");
    res.json(customer);
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ADMIN: Fetch all customers
router.get("/all", adminProtect, async (req, res) => {
  try {
    const customers = await Customer.find().select("-password").sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

module.exports = router;