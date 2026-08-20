# ChickYen Achar - Backend API 🍗🌶️

This repository contains the Node.js and Express backend that powers the **ChickYen Achar** e-commerce platform and its comprehensive administrative dashboard.

## 🚀 Tech Stack
- **Framework:** Node.js with Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JWT (JSON Web Tokens) & Firebase Admin SDK (Phone/Google Auth)
- **Email Services:** Nodemailer

## ✨ Key Features
- **OTP-Based Authentication:** Secure, passwordless login for customers via Email and Phone.
- **Admin & Staff Roles:** Role-based access control protecting critical API routes.
- **Order Management:** Create, track, and update order statuses with stock management.
- **Product Management:** Full CRUD operations for store products.
- **Activity Logging:** Real-time event tracking for new users and orders.
- **Newsletter Broadcasts:** Built-in email broadcast system for marketing.
- **WhatsApp Integration:** (Optional) Automated order status updates via WhatsApp.

## 🛠️ Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shubh6p/ChickYen-Backend.git
   cd ChickYen-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and configure the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   
   # Email Configuration
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_specific_password

   # Firebase Admin Config
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Allowed Frontend Origins
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📁 Folder Structure
- `/models`: Mongoose database schemas (User, Product, Order, ActivityLog, etc.)
- `/routes`: Express API endpoints
- `/middleware`: Authentication and role-checking middlewares
- `/utils`: Helper services (Email, Firebase, WhatsApp)
- `/uploads`: Directory for local file/image uploads

---
*Crafted with care. Delivered with flavour.*
