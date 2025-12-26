const express = require("express");
const router = express.Router(); 
const Order = require("../models/Order");
const customerProtect = require("../middleware/customerMiddleware");
const adminProtect = require("../middleware/adminMiddleware");

// PLACE ORDER (Public)
const Product = require("../models/Product"); // Ensure Product model is imported

// POST: Place Order (UPDATED: Removed stock decrement logic)
router.post("/place", async (req, res) => {
  try {
    const orderId = "YA-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    // Only save the order record; do NOT update Product stock here
    const newOrder = new Order({ ...req.body, orderId });
    await newOrder.save();
    res.status(201).json({ success: true, orderId });
  } catch (err) {
    res.status(500).json({ error: "Order creation failed" });
  }
});

// PUT: Update Status (Admin Only)
router.put("/status/:id", adminProtect, async (req, res) => {
  try {
    const { status } = req.body;
    // Find the order first to check its current status
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ error: "Order not found" });

    // 🚀 STOCK LOGIC: Only decrease if moving from 'Processing' to 'Verified'
    if (status === "Verified" && order.status === "Processing") {
      const Product = require("../models/Product"); 
      
      for (const item of order.items) {
        // Look for the new productId field
        const pId = item.productId; 
        
        if (pId) {
          const product = await Product.findById(pId);
          if (product) {
            // Ensure we don't go below zero stock
            const newStock = Math.max(0, product.stock - item.quantity);
            await Product.findByIdAndUpdate(pId, { stock: newStock });
          }
        }
      }
    }

    // Update and save the new status
    order.status = status;
    await order.save();

    res.json(order);
  } catch (err) {
    console.error("Stock reduction error:", err);
    res.status(500).json({ error: "Failed to update status and stock" });
  }
});

// FETCH ALL (Admin Only)
router.get("/all", adminProtect, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// INVOICE (Admin & Owner Only)
router.get("/invoice/:id", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).send("Unauthorized");

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id; 

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send("Order not found");

    const User = require("../models/User");
    const adminUser = await User.findById(userId);
    const isAdmin = adminUser && ["admin", "owner"].includes(adminUser.role);
    const isOwner = order.customerId.toString() === userId.toString();

    if (!isAdmin && !isOwner) return res.status(403).send("Permission denied");
    if (!isAdmin && order.status !== "Delivered") return res.status(403).send("Invoice ready after delivery");

    res.send(`
      <html>
        <head><title>Invoice - ${order.orderId}</title></head>
        <body style="font-family: sans-serif; padding: 50px;">
          <h1 style="color: #ea580c;">Yen Achar Invoice</h1>
          <p>Order ID: <b>${order.orderId}</b></p>
          <hr>
          <p>Billed to: ${order.customerName}</p>
          <p>Address: ${order.pickupLocation?.fullAddress}</p>
          <table border="1" cellpadding="10" style="width: 100%; border-collapse: collapse;">
            <tr><th>Item</th><th>Qty</th><th>Subtotal</th></tr>
            ${order.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>₹${i.price * i.quantity}</td></tr>`).join('')}
          </table>
          <h2 style="text-align: right; color: #ea580c;">Total: ₹${order.totalAmount}</h2>
          <script>window.print();</script>
        </body>
      </html>
    `);
  } catch (err) { res.status(500).send("Invoice Error"); }
});

// USER HISTORY (Customer Only)
router.get("/user-history", customerProtect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; 
    const orders = await Order.find({ customerId: userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order history" });
  }
});

module.exports = router;