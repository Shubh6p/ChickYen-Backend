const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const adminProtect = require('../middleware/adminMiddleware'); // Import the protection

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
router.post('/register-staff', adminProtect, async (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: "Access Denied: Only the Owner can create admins." });
    }
    
    const { name, email, password, role } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: "Staff email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'admin' 
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "Staff created successfully" });
    } catch (err) {
        res.status(400).json({ error: "Error creating staff account" });
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
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

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
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
