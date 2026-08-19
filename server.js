const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const customerAuthRoutes = require("./routes/customerAuthRoutes");
const locationRoutes = require("./routes/locationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");
const subscriberRoutes = require("./routes/subscriberRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");



const app = express();

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Allow images to load on frontend
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, 
    "http://localhost:5173", 
    "https://chickyenachar.in", 
    "https://www.chickyenachar.in",
    "https://chickyen-frontend.vercel.app"
  ].filter(Boolean),
  credentials: true
}));
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
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/logs", activityLogRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => { res.send("Yen Achar Backend is running 🚀"); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });