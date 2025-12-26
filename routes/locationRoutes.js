const express = require("express");
const router = express.Router();
const PickupLocation = require("../models/PickupLocation");
const adminProtect = require("../middleware/adminMiddleware"); // Ensure this path is correct

// GET: Public - Fetch active pickup points for checkout
router.get("/pickup-points", async (req, res) => {
    try {
        const locations = await PickupLocation.find({ isActive: true });
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch locations" });
    }
});

// POST: Admin - Add new pickup point
router.post("/pickup-points", adminProtect, async (req, res) => {
    try {
        const location = new PickupLocation(req.body);
        await location.save();
        res.status(201).json(location);
    } catch (err) {
        res.status(400).json({ error: "Failed to create pickup point" });
    }
});

// DELETE: Admin - Delete a pickup point (Useful for management)
router.delete("/pickup-points/:id", adminProtect, async (req, res) => {
    try {
        await PickupLocation.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Location removed" });
    } catch (err) {
        res.status(400).json({ error: "Delete failed" });
    }
});

module.exports = router;