const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const customerProtect = require("../middleware/customerMiddleware");
const adminProtect = require("../middleware/adminMiddleware");
const { sendOrderStatusUpdate } = require("../utils/whatsappService");

// PLACE ORDER (Public)
const Product = require("../models/Product"); // Ensure Product model is imported

// POST: Place Order (UPDATED: Removed stock decrement logic)
router.post("/place", async (req, res) => {
    try {
        const orderId = "CYA-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const { paymentMethod = "cod" } = req.body;
        // Only save the order record; do NOT update Product stock here
        const newOrder = new Order({ ...req.body, orderId, paymentMethod });
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

        // 🔔 WHATSAPP NOTIFICATION
        // Triggered for key status changes
        if (["Verified", "Packed", "Out for Delivery", "Delivered", "Cancelled"].includes(status)) {
            // We use the phone number from the order record
            if (order.phone) {
                await sendOrderStatusUpdate(order.phone, order.orderId, status);
            }
        }

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
        <html lang="en">
          <head>
              <meta charset="UTF-8">
              <title>Invoice - ${order.orderId}</title>
              <style>
                  :root {
                      --primary: #ea580c;
                      --secondary: #0f172a;
                      --accent: #fff7ed;
                      --border: #e2e8f0;
                  }
                  body { 
                      font-family: 'Inter', system-ui, sans-serif; 
                      margin: 0; 
                      padding: 0; 
                      background: #f8fafc;
                      color: var(--secondary);
                  }
                  .invoice-box {
                      max-width: 850px;
                      margin: 40px auto;
                      padding: 50px;
                      background: #fff;
                      border-radius: 24px;
                      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                      border: 1px solid var(--border);
                  }
                  .header {
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      margin-bottom: 40px;
                      border-bottom: 2px solid var(--accent);
                      padding-bottom: 30px;
                  }
                  .brand h1 {
                      color: var(--primary);
                      margin: 0;
                      font-size: 28px;
                      font-weight: 800;
                      letter-spacing: -0.5px;
                  }
                  .brand p {
                      margin: 5px 0 0;
                      font-weight: 600;
                      color: #64748b;
                      font-size: 12px;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                  }
                  .invoice-meta {
                      text-align: right;
                  }
                  .invoice-meta h2 {
                      margin: 0;
                      font-size: 20px;
                      color: var(--secondary);
                  }
                  .grid {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: 40px;
                      margin-bottom: 40px;
                  }
                  .info-block h3 {
                      font-size: 10px;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      color: #94a3b8;
                      margin-bottom: 10px;
                  }
                  .info-block p {
                      margin: 0;
                      font-weight: 700;
                      line-height: 1.5;
                  }
                  table {
                      width: 100%;
                      border-collapse: collapse;
                      margin-bottom: 40px;
                  }
                  th {
                      background: var(--accent);
                      color: var(--primary);
                      text-align: left;
                      padding: 15px;
                      font-size: 12px;
                      text-transform: uppercase;
                      font-weight: 800;
                  }
                  td {
                      padding: 15px;
                      border-bottom: 1px solid var(--border);
                      font-size: 14px;
                      font-weight: 500;
                  }
                  .total-section {
                      display: flex;
                      justify-content: flex-end;
                  }
                  .total-box {
                      background: var(--secondary);
                      color: white;
                      padding: 20px 40px;
                      border-radius: 16px;
                      text-align: right;
                  }
                  .total-box p {
                      margin: 0;
                      font-size: 12px;
                      opacity: 0.7;
                  }
                  .total-box h2 {
                      margin: 5px 0 0;
                      font-size: 24px;
                      color: #fb923c;
                  }
                  .actions {
                      margin-top: 40px;
                      text-align: center;
                  }
                  .btn {
                      background: var(--primary);
                      color: white;
                      padding: 12px 25px;
                      border-radius: 12px;
                      border: none;
                      font-weight: 700;
                      cursor: pointer;
                      transition: transform 0.2s;
                  }
                  .btn:hover { transform: scale(1.05); }

                  @media print {
                      body { background: white; }
                      .invoice-box { border: none; box-shadow: none; margin: 0; padding: 20px; }
                      .actions { display: none; }
                  }
              </style>
          </head>
          <body>
              <div class="invoice-box">
                  <div class="header">
                      <div class="brand">
                          <h1>Chicken Pickle Yen Achar</h1>
                          <p>Authentic Manipuri Flavour</p>
                      </div>
                      <div class="invoice-meta">
                          <h2>INVOICE</h2>
                          <p style="font-size: 12px; color: #94a3b8;">ID: #${order.orderId}</p>
                      </div>
                  </div>

                  <div class="grid">
                      <div class="info-block">
                          <h3>Billed To</h3>
                          <p>${order.customerName}</p>
                          <p style="font-weight: 400; color: #64748b;">${order.email || ''}</p>
                      </div>
                      <div class="info-block" style="text-align: right;">
                          <h3>Date Issued</h3>
                          <p id="currentDate"></p>
                          <p style="font-size: 11px; color: #64748b; margin-top: 5px;">Payment Mode: ${order.paymentMethod?.toUpperCase() || 'COD'}</p>
                      </div>
                  </div>

                  <div class="info-block" style="margin-bottom: 40px;">
                      <h3>Pickup Point Address</h3>
                      <p>${order.pickupLocation?.locationName || 'Main Hub'}</p>
                      <p style="font-weight: 400; color: #64748b;">${order.pickupLocation?.fullAddress || 'Address not specified'}</p>
                  </div>

                  <table>
                      <thead>
                          <tr>
                              <th>Description</th>
                              <th style="text-align: center;">Qty</th>
                              <th style="text-align: right;">Price</th>
                              <th style="text-align: right;">Amount</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${order.items.map(i => `
                              <tr>
                                  <td>
                                      <div style="font-weight: 700;">${i.name}</div>
                                      <div style="font-size: 11px; color: #94a3b8;">${i.weight || ''}</div>
                                  </td>
                                  <td style="text-align: center;">${i.quantity}</td>
                                  <td style="text-align: right;">₹${i.price}</td>
                                  <td style="text-align: right;">₹${i.price * i.quantity}</td>
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>

                  <div class="total-section">
                      <div class="total-box">
                          <p>Grand Total (INR)</p>
                          <h2>₹${order.totalAmount}</h2>
                      </div>
                  </div>

                  <div class="actions">
                      <button class="btn" onclick="window.print()">Print Invoice</button>
                  </div>

                  <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8;">
                      <p>Thank you for choosing Yen Achar! Follow us for more spicy updates.</p>
                  </div>
              </div>

              <script>
                  document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric'
                  });
              </script>
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