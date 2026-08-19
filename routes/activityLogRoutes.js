const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog");
const adminProtect = require("../middleware/adminMiddleware");

// @route   GET /api/logs
// @desc    Get all activity logs
// @access  Admin
router.get("/", adminProtect, async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error("Fetch Logs Error:", error);
    res.status(500).json({ message: "Server error fetching logs" });
  }
});

module.exports = router;
