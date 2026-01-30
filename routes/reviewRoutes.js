const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const customerProtect = require("../middleware/customerMiddleware");
const multer = require("multer");
const path = require("path");

// MULTER CONFIG
// Ensure the 'uploads' directory exists in your root or handle it dynamically.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `review-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// GET ALL REVIEWS (User specific - for Order History)
router.get("/all", customerProtect, async (req, res) => {
    try {
        const reviews = await Review.find({ customerId: req.user._id });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

// GET PUBLIC APPROVED REVIEWS (For Wall of Love)
router.get("/public", async (req, res) => {
    try {
        const reviews = await Review.find({ status: "Approved" }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

// ADD REVIEW (With Image Support)
router.post("/add", customerProtect, upload.single("reviewImage"), async (req, res) => {
    try {
        const { orderId, rating, spiceLevel, comment } = req.body;

        // Validation
        if (!orderId || !rating) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let imageUrl = "";
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const newReview = new Review({
            customerId: req.user._id,
            customerName: req.user.name,
            orderId,
            rating,
            spiceLevel,
            comment,
            imageUrl
        });

        await newReview.save();
        res.status(201).json({ success: true, review: newReview });
    } catch (err) {
        console.error("Review Add Error:", err);
        res.status(500).json({ error: "Failed to add review" });
    }
});

// ADMIN: GET ALL REVIEWS (For Dashboard)
router.get("/all-admin", async (req, res) => {
    try {
        // Fetch all reviews, sorted by newest
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

// ADMIN: UPDATE REVIEW STATUS (Approve/Reject)
router.put("/status/:id", async (req, res) => {
    try {
        const { status } = req.body; // "Approved" or "Rejected"
        if (!["Approved", "Rejected", "Pending"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!review) return res.status(404).json({ error: "Review not found" });

        res.json({ success: true, review });
    } catch (err) {
        res.status(500).json({ error: "Failed to update review status" });
    }
});

// ADMIN: DELETE REVIEW
router.delete("/:id", async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ error: "Review not found" });
        res.json({ success: true, message: "Review deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete review" });
    }
});

module.exports = router;
