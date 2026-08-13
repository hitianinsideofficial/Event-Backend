# 🚀 HITian Inside — Event Registration & Certificate Verification Backend API

Production-ready RESTful API service powering the official **HITian Inside** event portal, flagship event registrations (*Swaraj-E-Hind*, *Pratidhwani*), observer submission review portal, Brevo transactional email delivery, and digital certificate verification.

---

## 🌟 Architecture & Key Features

- **Express.js & TypeScript**: Modular Controller-Service architecture written in strong static TypeScript.
- **MongoDB Atlas Integration**: Mongoose document schemas with resilient fallback sample data for offline environments.
- **Flagship Event Presets**:
  - **Pratidhwani**: Offline flagship event with multi-select competition category enrollment (*OPEN MIC*, *YOUTH PARLIAMENT*, *LIVE ART*), dynamic payment UTR verification, and automated Brevo confirmation emails with embedded QR entrance passes.
  - **Swaraj-E-Hind**: Independence celebration event with multi-domain submission handling (Photography, Reel Making, Creative Writing, Digital Art).
- **Website Catalog Visibility Control**:
  - `isHidden: boolean` property on events allows admins to publish or hide events from the main public catalog (`/`) while remaining accessible in the admin console.
- **Observer Live Submission Preview Portal**:
  - Dedicated Observer authentication, live grid submission photo previews, and attendance QR check-in status verification.
- **Transactional Email Service (Brevo API)**:
  - Automated HTML confirmation emails containing unique digital passes, QR entry verification codes, and WhatsApp group links.
- **Cloud & File Storage**:
  - Integrated Cloudinary buffer upload pipeline for image submissions and Google Drive API fallback.

---

## 📁 Repository Structure

```
backend/
├── src/
│   ├── config/             # Database connection & environment configuration
│   ├── controllers/        # Route logic (event, submission, observer, certificate, analytics)
│   ├── middlewares/        # Authentication, CORS, error handling & upload middlewares
│   ├── models/             # Mongoose Schemas (Event, Submission, Observer, Log, Certificate)
│   ├── routes/             # Express Routers (/events, /submissions, /observer, /certificates)
│   ├── services/           # External API Services (Brevo Email, Cloudinary, Google Drive)
│   ├── types/              # TypeScript Interfaces & API Type Contracts
│   └── app.ts              # Express App Entrypoint
├── package.json
└── tsconfig.json
```

---

## 🛠️ Environment Configuration (`.env`)

Create a `.env` file in the root `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/eventform?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=event@hitianinside.in
BREVO_SENDER_NAME=HITian Inside Events
```

---

## 📡 Primary API Endpoints

### 📅 Events API (`/api/events`)
- `GET /api/events` — Fetch active public events (`?includeDone=true` for all events, `?admin=true` for non-hidden events).
- `GET /api/events/:id` — Fetch event details by ID.
- `POST /api/events` — Create a new event (with preset options).
- `PUT /api/events/:id` — Update event details and banner URLs.
- `PATCH /api/events/:id/status` — Update event status (`UPCOMING`, `LIVE`, `DONE`).
- `PATCH /api/events/:id/visibility` — Toggle website visibility (`isHidden: true | false`).
- `DELETE /api/events/:id` — Delete event.

### 📝 Submissions & Registration API (`/api/submissions`)
- `POST /api/submissions` — Submit registration / event entry (Multipart form data).
- `GET /api/submissions` — Fetch all submissions for an event.
- `POST /api/submissions/:id/checkin` — Perform QR code attendance check-in.

### 👁️ Observer Portal API (`/api/observer`)
- `POST /api/observer/login` — Observer passcode authentication.
- `GET /api/observer/submissions` — Fetch submissions for live grid preview.
- `POST /api/observer/verify` — Verify submission status.

### 📜 Certificate Verification API (`/api/certificates`)
- `GET /api/certificates/:certificateId` — Verify student certificate authenticity.

---

## 🚦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build Production Bundle**:
   ```bash
   npm run build
   ```

4. **Start Production Server**:
   ```bash
   npm start
   ```
