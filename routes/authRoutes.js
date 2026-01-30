const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const adminProtect = require('../middleware/adminMiddleware'); // Import the protection

// =====================
// NEW: VERIFY TOKEN (Used by Frontend for Security)
// =====================
router.get('/verify', adminProtect, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// =====================
// NEW: GET ALL STAFF (Admin Protected)
// =====================
router.get('/users', adminProtect, async (req, res) => {
    try {
        // Fetch users who are staff members
        const staff = await User.find({ role: { $in: ['admin', 'owner'] } }).select('-password');
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch staff list" });
    }
});

// =====================
// UPDATED: REGISTER STAFF (Admin Protected)
// =====================
// =====================
// NEW: REGISTER STAFF (OTP FLOW)
// =====================

// Step 1: Initialize Registration (Send OTP)
router.post('/register-staff-init', adminProtect, async (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: "Access Denied: Only Owner can add staff." });
    }

    const { email } = req.body;
    try {
        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: "User already exists with this email." });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const TempVerify = require('../models/TempVerify');

        // Upsert temp record
        await TempVerify.findOneAndUpdate(
            { email },
            { email, otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
            { upsert: true, new: true }
        );

        // Send Email
        const { sendEmail } = require('../utils/emailService');
        const subject = "Admin Invitation OTP";
        const message = `You have been invited to join the admin panel. Your verification code is: ${otp}.`;

        const emailSent = await sendEmail(email, subject, message, `<p>Verification Code: <b>${otp}</b></p>`);

        if (!emailSent) {
            console.log(`[DEV MODE] Invite OTP for ${email}: ${otp}`);
        }

        res.json({ success: true, message: "Verification code sent." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send OTP." });
    }
});

// Step 2: Complete Registration (Verify OTP & Create User)
router.post('/register-staff-complete', adminProtect, async (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: "Access Denied." });
    }

    const { email, otp, name, role } = req.body;

    try {
        const TempVerify = require('../models/TempVerify');
        const record = await TempVerify.findOne({ email });

        if (!record) return res.status(400).json({ error: "OTP expired or invalid." });
        if (record.otp !== otp) return res.status(400).json({ error: "Incorrect verification code." });

        // Create User (Password removed/randomized as they login via OTP now)
        // We set a dummy password just in case schema still requires it, though we removed it from schema
        const newUser = new User({
            name,
            email,
            role: role || 'admin',
            profileCompleted: true
        });

        await newUser.save();
        await TempVerify.deleteOne({ email }); // Cleanup

        res.status(201).json({ success: true, message: "Staff added successfully." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed." });
    }
});

router.put('/update-staff/:id', adminProtect, async (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: "Access Denied: Only the Owner can create admins." });
    }
    try {
        const { name, email, role } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role },
            { new: true }
        ).select('-password');

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        res.status(400).json({ error: "Update failed" });
    }
});

// =====================
// UPDATE STAFF
// =====================
router.put('/update-staff/:id', adminProtect, async (req, res) => {
    // START MODIFICATION: Allow 'admin' role to update too? 
    // User requested "Owner can only see these options".
    // So we should enforce Owner only here, or at least restrict who can update whom.
    // For simplicity following request: Owner Only.
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: "Access Denied: Only Owner can edit staff." });
    }

    try {
        const { name, email, role } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role },
            { new: true }
        );

        res.json({ success: true, user: updatedUser });
    } catch (err) {
        res.status(400).json({ error: "Update failed" });
    }
});

// =====================
// DELETE STAFF (Admin Protected)
// =====================
router.delete('/delete-staff/:id', adminProtect, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({ error: "Access Denied: Only the Owner can remove staff." });
        }

        const staffTodelete = await User.findById(req.params.id);
        if (staffTodelete && staffTodelete.role === 'owner') {
            return res.status(400).json({ error: "Critical Error: The Owner account cannot be deleted." });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Staff removed" });
    } catch (err) {
        res.status(400).json({ error: "Delete failed" });
    }
});

// =====================
// LOGIN
// =====================
// =====================
// ADMIN OTP AUTHENTICATION
// =====================

// 1. SEND OTP (Step 1)
router.post('/send-admin-otp', async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Check if user exists and is authorized (Admin/Owner)
        const user = await User.findOne({ email });
        if (!user || !['admin', 'owner'].includes(user.role)) {
            return res.status(403).json({ error: "Access Denied. Email not authorized." });
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

        // 3. Save to DB
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // 4. Send Email
        const { sendEmail } = require('../utils/emailService');
        const subject = "Your Admin Login OTP";
        const message = `Your OTP for Admin Access is: ${otp}. It expires in 5 minutes.`;

        // Try sending email, fallback to console if credentials missing (Dev mode)
        const emailSent = await sendEmail(email, subject, message, `<p>Your OTP is <b>${otp}</b></p>`);

        if (!emailSent) {
            console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
        }

        res.json({ success: true, message: "OTP sent to your email." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during OTP generation" });
    }
});

// 2. VERIFY OTP (Step 2)
router.post('/verify-admin-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "User not found" });

        // Check OTP
        if (user.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        // Check Expiry
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ error: "OTP Expired" });
        }

        // Clear OTP after successful login
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server verification error" });
    }
});

module.exports = router;
