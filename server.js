const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const customerAuthRoutes = require("./routes/customerAuthRoutes");
const locationRoutes = require("./routes/locationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");



const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerAuthRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => { res.send("Yen Achar Backend is running 🚀"); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });