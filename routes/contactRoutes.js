const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../utils/emailService');

router.post('/send', async (req, res) => {
    const { name, phone, subject, message } = req.body;

    if (!name || !phone || !subject || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const success = await sendContactEmail({ name, phone, subject, message });
        if (success) {
            res.status(200).json({ message: "Inquiry sent successfully" });
        } else {
            res.status(500).json({ error: "Failed to send inquiry" });
        }
    } catch (error) {
        console.error("Contact route error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
