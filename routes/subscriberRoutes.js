const express = require("express");
const router = express.Router();
const Subscriber = require("../models/Subscriber");
const { sendEmail } = require("../utils/emailService");
const adminProtect = require("../middleware/adminMiddleware");

// @route   POST /api/subscribers
// @desc    Subscribe to the newsletter
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingSubscriber = await Subscriber.findOne({ email });

    if (existingSubscriber) {
      if (!existingSubscriber.active) {
        existingSubscriber.active = true;
        await existingSubscriber.save();
        return res.status(200).json({ message: "Subscription reactivated successfully!" });
      }
      return res.status(400).json({ message: "Email is already subscribed!" });
    }

    const newSubscriber = new Subscriber({ email });
    await newSubscriber.save();

    res.status(201).json({ message: "Subscribed successfully!" });
  } catch (error) {
    console.error("Subscription Error:", error);
    res.status(500).json({ message: "Server error during subscription" });
  }
});

// @route   GET /api/subscribers
// @desc    Get all active subscribers
// @access  Admin
router.get("/", adminProtect, async (req, res) => {
  try {
    const subscribers = await Subscriber.find({ active: true }).sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (error) {
    console.error("Fetch Subscribers Error:", error);
    res.status(500).json({ message: "Server error fetching subscribers" });
  }
});

// @route   POST /api/subscribers/broadcast
// @desc    Send a broadcast email to all active subscribers
// @access  Admin
router.post("/broadcast", adminProtect, async (req, res) => {
  try {
    const { subject, message, isHtml } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    const subscribers = await Subscriber.find({ active: true });
    
    if (subscribers.length === 0) {
      return res.status(400).json({ message: "No active subscribers found" });
    }

    // Send emails in parallel
    const emailPromises = subscribers.map(sub => {
      return sendEmail(
        sub.email, 
        subject, 
        isHtml ? "" : message, 
        isHtml ? message : ""
      );
    });

    await Promise.all(emailPromises);

    res.status(200).json({ message: `Broadcast sent successfully to ${subscribers.length} subscribers!` });
  } catch (error) {
    console.error("Broadcast Error:", error);
    res.status(500).json({ message: "Server error sending broadcast" });
  }
});

module.exports = router;
