const express = require("express");
const router = express.Router();
const adminProtect = require("../middleware/adminMiddleware"); // Correct import
const Product = require("../models/Product");

// ADMIN: Add
router.post("/add", adminProtect, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch { res.status(400).json({ error: "Failed to add" }); }
});

// ADMIN: Get All
router.get("/", adminProtect, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// PUBLIC: Get
router.get("/public", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// ADMIN: Update
router.put("/:id", adminProtect, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch { res.status(400).json({ error: "Update failed" }); }
});

// ADMIN: Delete
router.delete("/:id", adminProtect, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(400).json({ error: "Delete failed" }); }
});

module.exports = router;