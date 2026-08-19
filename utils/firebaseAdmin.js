const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Firebase Admin using values from .env
// Note: FIREBASE_PRIVATE_KEY should be in quotes in .env and include \n
if (!admin.apps.length) {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (privateKey) {
            // Remove quotes and handle escaped newlines
            privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log("Firebase Admin Initialized ✅");
    } catch (error) {
        console.error("Firebase Admin Initialization Error ❌:", error.message);
    }
}

module.exports = admin;
