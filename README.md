# 🎫 APNATICKET

APNATICKET is a comprehensive digital platform designed to simplify and automate the process of booking, managing, and validating tickets for transportation and events through a centralized, user-friendly system. 

The platform features a fully-fleshed frontend and a secure, rules-driven Node.js backend using Firebase for authentication and database operations.

## 🌟 Key Features

### User Experience
- **Dynamic Event Discovery**: Browse, search, and filter events/travel tickets dynamically fetched from the API.
- **e-INR Simulation Wallet**: Dedicated digital wallet specifically simulating E-Rupee (CBDC) transactions preventing UPI/Card loopholes.
- **Integrated Booking Flow**: Seamless transition from event selection → seat selection → securely locked payment process.
- **My Bookings Dashboard**: Manage past and upcoming bookings, view invoices, and request cancellations with instant e-INR refunds.
- **Secure QR Ticketing**: Digital tickets are issued instantly containing AES-256 encrypted passenger metadata and booking data.

### Identity & Security
- **Mandatory KYC Verification**:
  - Majors (18+) require valid PAN format (`ABCDE1234F`).
  - Minors require valid Aadhaar linked to a Guardian's PAN.
- **Photo ID Validation**: Users must upload a photo ID document which is staged for Admin approval before any bookings can be made.
- **Booking Rules Engine**:
  - Hard limit of 2 tickets per transaction.
  - Hard daily cap of 2 bookings *per PAN* (to prevent bulk purchasing across duplicate accounts).
  - Every individual passenger must provide a valid PAN or Aadhaar.
- **Immutable Audit Trails**: Every major action (registration, ID verification, booking, cancellation) is logged immutably.
- **Data Privacy**: PAN and Aadhaar data is masked in API responses (`ABCD****4F`).

### Admin Capabilities
- **Real-Time Analytics Dashboard**: Monitor total sales, active tickets, and revenue growth.
- **Anomaly Detection**: Automated scan to flag excessive bookings, duplicate PANs, and unverified bookers.
- **User Management**: Approve/reject uploaded user IDs and monitor the ecosystem.
- **QR Validation**: Specialized endpoints for scanners to securely decrypt and validate digital tickets.

---

## 🏗️ Architecture Stack

- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (No heavy frameworks for speed and simplicity).
- **Backend API**: Node.js, Express.js.
- **Database & Auth**: Firebase Admin SDK (Firestore, Firebase Auth).
- **Security**: JWT (JSON Web Tokens), `helmet`, `express-rate-limit`, AES-256-CBC Encryption.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- A Firebase Project (with Firestore and Email/Password Auth enabled)
- A Firebase Admin SDK Service Account JSON Key

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables:
   - Copy `.env.example` to `.env`
   - Generate a secure JWT Secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - Generate a secure QR Encryption Key (AES-256): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Update `.env` with these values and your Firebase frontend URL (default is `http://127.0.0.1:5500`).
4. Add Firebase Credentials:
   - Place your Firebase Admin SDK JSON file at `backend/config/serviceAccountKey.json`.
   - *Note: If no service account is provided, the backend will automatically run in **Mock Mode** using seed data for testing the UI.*
5. Start the server:
   ```bash
   npm start
   ```
   *The server will run on port 5000: `http://localhost:5000`*

### 2. Frontend Setup

The frontend is purely static HTML/CSS/JS. Ensure your backend server is running, then serve the `frontend` folder using any local HTTP server.

Example using VS Code Live Server or Python:
```bash
cd frontend
npx serve -l 5500
```
Then open `http://localhost:5500` in your web browser.

---

## 🗂️ API Documentation

When the backend server is running, you can access the full API map by visiting:
**`GET http://localhost:5000/api`**

**Core Route Modules:**
- `/api/auth` — Registration, login, ID upload/verification, and KYC checks.
- `/api/events` — Event and ticket inventory management.
- `/api/bookings` — Booking engine, seat locking, and cancellation.
- `/api/wallet` — E-Rupee wallet balances and top-ups.
- `/api/tickets` — QR generation and cryptographic validation.
- `/api/admin` — Analytics, anomaly detection, and audit logs.

---

## 💡 Testing in Mock Mode

If you just want to view the project without setting up Firebase, the backend will gracefully default to **Mock Mode**. 

The mock data generates pre-populated accounts for testing:
- **Admin**: `admin@apnaticket.com` / `pass123`
- **Verified Adult User**: `john@example.com` / `pass123`
- **Verified Minor User**: `rahul@example.com` / `pass123`
- **Pending Verification User**: `sneha@example.com` / `pass123`

You can log in with any of these to freely test the different constraint gates, ticket generation, and admin dashboards.
