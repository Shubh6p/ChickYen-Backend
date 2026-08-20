# ChickYen Achar - Backend API 🍗🌶️

Node.js & Express REST API powering the ChickYen Achar store and admin dashboard.

## Features
- **OTP Auth**: Passwordless login via Email (Nodemailer) & Phone (Firebase).
- **Store API**: Endpoints for products, orders, and reviews.
- **Admin API**: Protected routes for inventory, sales, broadcasts, and activity logs.

## Quick Setup
1. Clone the repo and run `npm install`.
2. Create a `.env` file with your `MONGO_URI`, `JWT_SECRET`, email credentials, and Firebase config.
3. Run `npm run dev` to start the server.
