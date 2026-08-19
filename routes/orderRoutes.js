const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const customerProtect = require("../middleware/customerMiddleware");
const adminProtect = require("../middleware/adminMiddleware");
const { sendOrderStatusUpdate } = require("../utils/whatsappService");
const { sendEmail } = require("../utils/emailService");
const ActivityLog = require("../models/ActivityLog");

// PLACE ORDER (Public)
const Product = require("../models/Product"); // Ensure Product model is imported

// POST: Place Order (Secured)
router.post("/place", customerProtect, async (req, res) => {
    try {
        const orderId = "CYA-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const { paymentMethod = "cod", items, pickupLocation } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        // 🚀 STOCK VALIDATION AND PRICE CALCULATION
        let calculatedTotal = 0;
        const verifiedItems = [];

        for (const item of items) {
            const pId = item.productId;
            if (!pId) return res.status(400).json({ error: "Invalid product in cart" });

            const product = await Product.findById(pId);
            if (!product) return res.status(404).json({ error: `Product not found` });

            if (!product.isAvailable) {
                return res.status(400).json({ error: `Product ${product.name} is no longer available` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Not enough stock for ${product.name}. Only ${product.stock} left.` 
                });
            }

            calculatedTotal += product.price * item.quantity;
            verifiedItems.push({
                productId: product._id,
                name: product.name,
                price: product.price, // Trusting DB price, ignoring frontend price
                quantity: item.quantity,
                weight: product.weight
            });
        }

        // Save the order record
        const newOrder = new Order({ 
            ...req.body, 
            customerId: req.user._id, // Enforce authenticated user
            items: verifiedItems,
            totalAmount: calculatedTotal,
            orderId, 
            paymentMethod 
        });
        console.log("DEBUG: Order payload before save:", JSON.stringify(newOrder.toObject(), null, 2));
        await newOrder.save();

        // 🚀 STOCK REDUCTION
        for (const item of verifiedItems) {
            await Product.findByIdAndUpdate(item.productId, { 
                $inc: { stock: -item.quantity } 
            });
        }

        // 🚀 CREATE ACTIVITY LOG
        await ActivityLog.create({
            type: "NEW_ORDER",
            message: `New order placed: ${orderId} (Total: ₹${calculatedTotal})`,
            metadata: { orderId, totalAmount: calculatedTotal, customerId: req.user._id }
        });

        // 🚀 SEND ADMIN NOTIFICATION EMAIL
        const adminEmail = process.env.EMAIL_USER;
        if (adminEmail) {
            const emailHtml = `
                <h2>New Order Received!</h2>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Total Amount:</strong> ₹${calculatedTotal}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
                <hr />
                <h3>Items:</h3>
                <ul>
                    ${verifiedItems.map(item => `<li>${item.name} (${item.weight}) x ${item.quantity} = ₹${item.price * item.quantity}</li>`).join("")}
                </ul>
                <br />
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/orders">Go to Admin Panel</a></p>
            `;
            sendEmail(adminEmail, `🚀 New Order Placed: ${orderId}`, `New order placed: ${orderId} for ₹${calculatedTotal}`, emailHtml);
        }

        res.status(201).json({ success: true, orderId, totalAmount: calculatedTotal });
    } catch (err) {
        console.error(err);
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

        // 🚀 STOCK LOGIC: Restore stock if order is Cancelled
        if (status === "Cancelled" && order.status !== "Cancelled") {
            const Product = require("../models/Product");

            for (const item of order.items) {
                const pId = item.productId;

                if (pId) {
                    const product = await Product.findById(pId);
                    if (product) {
                        const newStock = product.stock + item.quantity;
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

        res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");

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
                      @page {
                          margin: 0;
                          size: auto;
                      }
                      body { 
                          background: white; 
                          margin: 0;
                          padding: 15px;
                      }
                      .invoice-box { 
                          border: none; 
                          box-shadow: none; 
                          margin: 0; 
                          padding: 0;
                          max-width: 100%;
                          page-break-inside: avoid;
                      }
                      .header { margin-bottom: 20px; padding-bottom: 15px; }
                      .grid { margin-bottom: 20px; gap: 20px; }
                      .info-block { margin-bottom: 20px !important; }
                      table { margin-bottom: 20px; }
                      th, td { padding: 10px; }
                      .total-box { padding: 15px 30px; }
                      .footer-text { margin-top: 30px !important; }
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
                      <button id="printBtn" class="btn">Print Invoice</button>
                  </div>

                  <div class="footer-text" style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8;">
                      <p>Thank you for choosing Yen Achar! Follow us for more spicy updates.</p>
                  </div>
              </div>

              <script>
                  document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric'
                  });
                  document.getElementById('printBtn').addEventListener('click', function() {
                      window.print();
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