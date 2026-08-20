# ChickYen Achar - Backend Application 🍗🌶️

Welcome to the backend repository of **ChickYen Achar**, a full-featured e-commerce platform specializing in premium, spicy chicken pickles. This Node.js/Express RESTful API handles everything from passwordless authentication to complex order management and administrative logging.

---

## 🚀 Tech Stack & Architecture

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (using Mongoose ODM)
- **Authentication:** JSON Web Tokens (JWT) & Firebase Admin SDK
- **Security:** Helmet, CORS, Express Rate Limit
- **Email Service:** Nodemailer
- **File Uploads:** Multer (Local storage)

---

## ✨ Comprehensive Feature List

### 1. Advanced Passwordless Authentication
- **Customer Auth:** OTP-based login via Email (Nodemailer) and Phone (Firebase OTP). No passwords to remember.
- **Admin/Staff Auth:** Secure OTP login restricted to authorized emails only, managed via a dedicated `User` model.
- **Role-Based Access Control (RBAC):** Middleware protecting sensitive endpoints, ensuring only `admin` or `owner` roles can access dashboard APIs.

### 2. Product & Inventory Management
- Full CRUD capabilities for products (Add, Edit, Delete, Fetch).
- Automatic stock reduction upon successful order placement.
- Image uploads stored locally in the `/uploads` directory.

### 3. Order Processing & Tracking
- **Checkout Flow:** Validates stock, calculates totals, and creates order records.
- **Status Updates:** Admins can transition orders through states: `Pending` ➔ `Processing` ➔ `Shipped` ➔ `Delivered`.
- **Invoices:** Generates dynamic HTML invoices for customers and admins.
- **WhatsApp Integration:** Hooks available to send WhatsApp notifications via UltraMsg (configurable in `whatsappService.js`).

### 4. Admin Dashboard Services
- **Activity Logs:** Tracks all crucial system events like "New User Registered" or "New Order Placed" for complete auditability.
- **Broadcast System:** Collects subscriber emails and allows admins to send promotional newsletters.
- **Analytics:** APIs to fetch sales data, total users, total orders, and revenue metrics.
- **Review Management:** Customers can submit reviews; admins can approve, feature, or delete them.

---

## 📁 Project Structure Deep Dive

```text
backend/
├── config/              # Database connection configurations
├── middleware/          # Custom Express middlewares
│   ├── adminMiddleware.js    # Verifies Admin JWT & Roles
│   └── customerMiddleware.js # Verifies Customer JWT
├── models/              # Mongoose Database Schemas
│   ├── ActivityLog.js        # System audit logs
│   ├── Customer.js           # E-commerce shoppers
│   ├── Order.js              # Placed orders
│   ├── Product.js            # Store inventory
│   ├── Review.js             # Customer testimonials
│   ├── Subscriber.js         # Newsletter emails
│   └── User.js               # Admin/Staff accounts
├── routes/              # API Route Definitions
│   ├── activityLogRoutes.js
│   ├── authRoutes.js         # Admin Authentication
│   ├── customerAuthRoutes.js # Shopper Authentication
│   ├── orderRoutes.js
│   ├── productRoutes.js
│   └── ...
├── utils/               # Helper Services
│   ├── emailService.js       # Nodemailer config & templates
│   ├── firebaseAdmin.js      # Firebase SDK initialization
│   └── whatsappService.js    # UltraMsg integration
├── uploads/             # Static directory for product images
└── server.js            # Application entry point
```

---

## ⚙️ Environment Variables (`.env`)

To run this project locally, create a `.env` file in the root directory. You will need to provide the following variables:

```env
# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database & Security
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/database
JWT_SECRET=your_super_secret_jwt_key

# Email Configuration (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Firebase Admin Configuration (For Phone Auth)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"

# WhatsApp Configuration (Optional)
ULTRAMSG_INSTANCE_ID=your_instance_id
ULTRAMSG_TOKEN=your_token
```

---

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shubh6p/ChickYen-Backend.git
   cd ChickYen-Backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create the `.env` file as described above.

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The server will start (defaulting to `http://localhost:5000`) and connect to MongoDB.

5. **Production Deployment:**
   ```bash
   npm start
   ```
   *Note: Ensure the `/uploads` directory is created and has write permissions if hosting on a VPS. If using a serverless platform (like Render or Vercel), consider migrating image uploads to a cloud bucket like AWS S3 or Cloudinary, as local files are ephemeral.*
