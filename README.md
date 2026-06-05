# 🥛 DairyFlow - Dairy Business Management MVP

DairyFlow is a simple, modern, mobile-friendly responsive dashboard application for dairy owners to manage customers, milk subscriptions, daily orders, delivery tracking, workers, attendance, salaries, billing, payments, and revenue.

## 🚀 Features

1. **Customer Management**: Full CRUD, status tracking, search, and filtering by route/status.
2. **Milk Subscriptions**: Manage daily, alternate day, weekly, and monthly subscriptions for each customer with pause/resume support.
3. **One-time Orders**: Support selling milk, curd, ghee, and paneer on an ad-hoc basis.
4. **Delivery Tracking**: Group daily deliveries by route, assign delivery boys, track statuses (delivered, missed, cancelled).
5. **Worker & Attendance Management**: Track workers, register daily attendance (present, absent, half-day, leave).
6. **Salary Calculations**: Automatically calculate monthly payouts based on attendance, overtime, advance deductions.
7. **Billing & Payments**: Auto-calculate monthly invoices, log cash/UPI/bank payments, and export WhatsApp-friendly invoice text.
8. **Revenue Dashboard**: Real-time business insights (total revenue, paid vs outstanding dues, salary expenses, profit estimate) and charts.
9. **Subscription Billing**: 30-day Premium trial for registered users, plan upgrade modal, Razorpay payment-link checkout, plan-based access control, and customer-count limits by plan.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS 3.4 + Recharts + Lucide Icons
- **Backend API**: Node.js + Express
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication with email/password signup/login

---

## 💻 Installation & Setup

Follow these steps to run the application locally:

### Step 1: Install Dependencies
Install all frontend and backend dependencies:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run install:server
```

### Step 1.5: Configure Billing Environment Variables
Copy the example env files before testing the plan and payment flow:
```bash
cp .env.example .env
cp server/.env.example server/.env
```

Required billing variables:
- `VITE_API_BASE_URL`: Base URL for the Express API, usually `http://localhost:5001`
- `VITE_APP_BASE_URL`: Public web app URL used for Razorpay callback redirects (for example `https://dairyflow-blue.vercel.app`)
- `RAZORPAY_KEY_ID`: Razorpay API key ID
- `RAZORPAY_KEY_SECRET`: Razorpay API key secret

### Step 2: Start the Servers
You can run both the frontend and the backend server concurrently.

Run the **Frontend Web App** (runs on http://localhost:3000):
```bash
npm run dev
```

Run the **Backend API Server** (runs on http://localhost:5001):
```bash
npm run dev:server
```

### Step 3: Seed the Database
Populate your Firebase Firestore with sample seed data (20 customers, 5 workers, 4 products, 15 subscriptions, and pre-calculated logs):
```bash
npm run seed
```

*Note: Ensure the backend server is running before executing the seed command.*

---

## ☁️ Deploy Backend on Render

This repo includes a Render Blueprint file at `render.yaml` for the Express billing backend in `server/`.

### Create the Render Web Service
1. Push this repo to GitHub.
2. In Render, create a new **Web Service** from the repo.
3. Render can auto-detect the included `render.yaml`, or you can enter these values manually:
   - Root Directory: `server`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`

### Set Render Environment Variables
Add these environment variables in the Render Dashboard:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

For `FIREBASE_PRIVATE_KEY`, paste the full private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`.

### Connect Mobile/Web Billing
After Render gives you a public backend URL such as `https://dairyflow-api.onrender.com`, update your frontend env:

```bash
VITE_API_BASE_URL=https://your-render-backend.onrender.com
VITE_APP_BASE_URL=https://dairyflow-blue.vercel.app
```

Then rebuild the frontend and Android app so Razorpay payments work from the APK.

---

## 📂 Project Structure

- `src/components`: Reusable layout and custom UI components (Sidebar, BottomNav, Header, Modal, Loading, EmptyState).
- `src/pages`: 12 application pages (Dashboard, Customers, Subscriptions, Orders, Deliveries, Workers, Attendance, Salaries, Billing, Payments, Reports, Login).
- `src/services`: Firestore client integration modules.
- `src/contexts`: Authentication state provider using Firebase.
- `src/types`: TypeScript interfaces.
- `server/src/index.ts`: Express backend and database seeding REST endpoints.
- `server/src/data/seedData.ts`: Static mock objects for seeding.
