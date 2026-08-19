const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const adminProtect = require("../middleware/adminMiddleware");
const nodemailer = require("nodemailer");
// const twilio = require('twilio');
const { sendWhatsAppOTP } = require("../utils/whatsappService");
const firebaseAdmin = require("../utils/firebaseAdmin");
const ActivityLog = require("../models/ActivityLog");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: "Too many OTP requests from this IP, please try again after 15 minutes." }
});

// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID, 
//   process.env.TWILIO_AUTH_TOKEN
// );

/* =========================
   LOGIN
========================= */
// LOGIN AND PASSWORD ROUTES DEPRECATED FOR OTP-ONLY FLOW
// router.post("/login", ...);

/* =========================
   EMAIL OTP - SEND
========================= */
router.post("/send-email-otp", otpLimiter, async (req, res) => {
  const email = req.body.email?.toLowerCase();
  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await Customer.findOneAndUpdate(
      { email },
      {
        email,
        emailOtp: otp,
        otpExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
      },
      { upsert: true, new: true }
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"ChickYen Achar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email • ChickYen Achar",
      text: `Your verification code is ${otp}. It is valid for 10 minutes.`, // Fallback for basic email clients
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            
            <div style="padding: 30px 40px; border-bottom: 1px solid #eeeeee; text-align: left;">
              <h1 style="color: #E63946; margin: 0; font-size: 24px; font-weight: bold;">ChickYen Achar 🍗</h1>
            </div>

            <div style="padding: 40px;">
              <h2 style="color: #333333; font-size: 22px; margin-top: 0;">Verify your email address</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                Welcome to ChickYen Achar! You need to verify your email address to continue. Enter the following code to verify your account:
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px; border: 1px dashed #cccccc; text-align: left;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111111;">${otp}</span>
              </div>

              <p style="color: #888888; font-size: 14px; font-style: italic;">
                This one-time code is valid for <strong>10 minutes</strong>.
              </p>

              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />

              <p style="color: #777777; font-size: 14px; line-height: 1.4;">
                In case you were not trying to access ChickYen Achar, please ignore this email.
              </p>
            </div>

            <div style="padding: 20px 40px; background-color: #fafafa; text-align: center;">
              <p style="color: #aaaaaa; font-size: 12px; margin: 0;">
                Team ChickYen Achar — Crafted with care. Delivered with flavour.
              </p>
            </div>
          </div>
        </div>
      `
    });


    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/* =========================
   EMAIL OTP - VERIFY
========================= */
router.post("/verify-email-otp", async (req, res) => {
  const email = req.body.email?.toLowerCase();
  const otp = String(req.body.otp || "").trim();

  try {
    const customer = await Customer.findOne({
      email,
      emailOtp: otp
    });

    if (!customer) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (customer.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    const wasVerified = customer.isEmailVerified;
    customer.isEmailVerified = true;
    customer.emailOtp = undefined;
    customer.otpExpires = undefined;
    await customer.save();

    if (!wasVerified) {
      await ActivityLog.create({
        type: "NEW_USER_REGISTRATION",
        message: `New user registered: ${email}`,
        metadata: { customerId: customer._id, email }
      });
    }

    // GENERATE TOKEN IMMEDIATELY (OTP-ONLY AUTH)
    const token = jwt.sign({ _id: customer._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      message: "Email verified",
      token,
      customer: {
        _id: customer._id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        isEmailVerified: customer.isEmailVerified
      }
    });
  } catch (err) {
    res.status(500).json({ error: "OTP verification failed" });
  }
});

/* =========================
   SET PASSWORD (AFTER OTP)
========================= */
// router.post("/set-password", ...) - DEPRECATED


/* =========================
   PHONE OTP - SEND
========================= */
/* =========================
   PHONE OTP - SEND (MOCK MODE)
========================= */
router.post("/send-phone-otp", async (req, res) => {
  const { phone } = req.body;
  const token = req.headers.authorization?.split(" ")[1]; // Get token from header

  if (!phone) return res.status(400).json({ error: "Phone number is required" });
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Find by ID (from token) and update the phone field
    const customer = await Customer.findByIdAndUpdate(
      decoded._id,
      {
        phone: phone, // Save the number they are currently trying to verify
        phoneOtp: otp,
        phoneOtpExpires: Date.now() + 5 * 60 * 1000
      },
      { new: true }
    );

    if (!customer) return res.status(404).json({ error: "User account not found" });

    // Send the OTP via WhatsApp
    const result = await sendWhatsAppOTP(phone, otp);

    if (result.success) {
      res.json({ success: true, message: "Verification code sent to your WhatsApp!" });
    } else {
      res.status(500).json({ error: `WhatsApp Error: ${result.error || "Please check the number."}` });
    }
  } catch (err) {
    console.error("OTP Send Error:", err);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
});

/* =========================
   PHONE OTP - VERIFY (FIXED)
========================= */
router.post("/verify-phone-otp", async (req, res) => {
  const otp = String(req.body.otp || "").trim(); // Force string and trim
  const token = req.headers.authorization?.split(" ")[1];

  if (!otp) return res.status(400).json({ error: "OTP is required" });
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await Customer.findById(decoded._id);

    if (!customer) return res.status(404).json({ error: "Account not found" });

    // Debugging: Log what is in DB vs what was sent
    console.log(`Verifying for ${customer.phone}: DB OTP [${customer.phoneOtp}] vs Sent OTP [${otp}]`);

    if (!customer.phoneOtp || customer.phoneOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (customer.phoneOtpExpires < Date.now()) {
      return res.status(400).json({ error: "Phone OTP has expired" });
    }

    customer.isPhoneVerified = true;
    customer.phoneOtp = undefined;
    customer.phoneOtpExpires = undefined;
    await customer.save();

    res.json({ success: true, message: "Phone verified successfully!", isPhoneVerified: true });
  } catch (err) {
    res.status(401).json({ error: "Session expired or invalid token" });
  }
});

/* =========================
   FIREBASE PHONE VERIFY
========================= */

router.post("/verify-firebase-token", async (req, res) => {
  const { idToken, phone } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!idToken) return res.status(400).json({ error: "Security check failed (No Token)" });
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decodedFirebaseToken = await firebaseAdmin.auth().verifyIdToken(idToken);

    // Check if the verified phone matches (optional verification)
    // const firebasePhone = decodedFirebaseToken.phone_number;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await Customer.findById(decoded._id);

    if (!customer) return res.status(404).json({ error: "Account not found" });

    const wasVerified = customer.isPhoneVerified;
    customer.isPhoneVerified = true;
    if (phone) customer.phone = phone;
    await customer.save();

    if (!wasVerified) {
      await ActivityLog.create({
        type: "NEW_USER_REGISTRATION",
        message: `New user verified phone: ${phone || customer.email}`,
        metadata: { customerId: customer._id, phone }
      });
    }

    res.json({ success: true, message: "Phone verified via Firebase!", isPhoneVerified: true });
  } catch (err) {
    console.error("Firebase Token Error:", err);
    res.status(401).json({ error: "Invalid or expired Firebase verification" });
  }
});


/* =========================
   UPDATE DETAILS
========================= */
router.put("/details", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await Customer.findById(decoded._id);

    // ONLY allow updating the phone number if it hasn't changed, 
    // OR if the user is currently unverified. 
    // This prevents overwriting a verified number with an unverified one via the "Update Account" button.
    if (req.body.phone && req.body.phone !== customer.phone) {
      // We force the user to use the 'Verify Now' flow for phone changes
      // So we ignore phone updates here if they aren't verified yet.
      if (!customer.isPhoneVerified) {
        customer.phone = req.body.phone;
      }
    }

    customer.name = req.body.name || customer.name;
    customer.address = req.body.address || customer.address;
    await customer.save();

    res.json(customer);
  } catch (err) {
    res.status(401).json({ error: "Update failed" });
  }
});

/* =========================
   GET PROFILE
========================= */
router.get("/details", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await Customer.findById(decoded._id).select("-password");
    res.json(customer);
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

/* =========================
   ADMIN - ALL CUSTOMERS
========================= */
router.get("/all", adminProtect, async (req, res) => {
  try {
    const customers = await Customer.find()
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(customers);
  } catch {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

module.exports = router;
