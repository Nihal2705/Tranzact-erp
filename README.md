# TranZact ERP

[![React 19](https://img.shields.io/badge/React-19.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169e1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern, streamlined manufacturing ERP web application inspired by **TranZact**, engineered for small and medium manufacturing enterprises (SMEs). The platform unifies inventory tracking, multi-line sales and purchase orders, multi-stage production workflows with automated Bill of Materials (BOM) stock consumption, and executive reporting.

---

## Table of Contents

1. [Features & Modules](#features--modules)
2. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
3. [Demo Credentials](#demo-credentials)
4. [Technology Stack](#technology-stack)
5. [Project Architecture](#project-architecture)
6. [Getting Started (Local Development)](#getting-started-local-development)
7. [API Specification](#api-specification)
8. [Deployment Guide](#deployment-guide)
9. [Team Responsibilities](#team-responsibilities)

---

## Features & Modules

### 📊 1. Executive Dashboard
- **Live Business KPIs:** Instant visibility into Total Stock Valuation, Low-Stock items, Orders this month, Pending invoices, Dispatches in flight, and Completed production orders.
- **Interactive Visualizations (Recharts):**
  - *Orders Per Month:* Historical and current order intake trends.
  - *Stock Value by Item:* Donut chart showing capital allocation across items.
  - *Production Status Breakdown:* Distribution across lifecycle stages.
- **Actionable Lists:** Immediate alerts for low-stock thresholds and late deliveries.

### 📦 2. Inventory Management
- **Catalog Categorization:** Manage items categorized as Raw Materials (`RAW`), Finished Goods (`FINISHED`), or Packaging (`PACKAGING`).
- **Consistent Slide-Over Drawer:** Unified `<Drawer>` component for both item creation and editing.
- **Controlled Stock Adjustments:** Manual stock adjustments require a mandatory reason log and record atomic audit trails.
- **Stock Audit History:** Full chronological ledger showing date/time, quantity delta, post-change balance, reason, and employee attribution.
- **Low-Stock Alerting:** Visual warning badges and threshold monitoring.

### 📑 3. Sales & Purchase Orders
- **Multi-Line Order Processing:** Support for multiple line items with item selection, unit price, quantity, and real-time total computation.
- **Dual Status Tracking:** Independent states for commercial and physical progress:
  - *Invoice Status:* `Pending` · `Paid`
  - *Goods Status:* `Not Dispatched` · `Partial` · `Dispatched` / `Received`
- **Fulfillment & Dispatch:** Line-level dispatching and goods receipt workflows.
- **Audit Timeline:** Complete chronological event logs tracking invoice creation, payments, and shipments.

### ⚙️ 4. Production & Bill of Materials (BOM)
- **5-Stage State Machine:** Strict sequential progression:
  $$\text{PLANNED} \longrightarrow \text{PENDING} \longrightarrow \text{WIP} \longrightarrow \text{IN-TESTING} \longrightarrow \text{COMPLETED}$$
- **Automated BOM Consumption:** When a production order is marked `COMPLETED`, raw materials are atomically deducted from inventory and the finished goods stock is credited.
- **Material Shortfall Detection:** Pre-production validation calculating required raw materials vs. current on-hand stock.

### 📈 5. Reports & Data Export
- **Tabular Registers:**
  - *Stock Report:* Real-time quantities, units, valuations, and cost breakdown.
  - *Sales Register:* Customer orders, dispatch status, invoices, and totals.
  - *Purchase Register:* Supplier procurement, goods receipt, and payment tracking.
  - *Production Performance:* Finished goods output, target vs. completed quantities, and unit costs.
- **One-Click CSV Export:** Client-side CSV generator (`downloadCsv`) for instant offline auditing and spreadsheet analysis.

---

## Role-Based Access Control (RBAC)

The application enforces role permissions at both the frontend UI routing layer and backend API middleware:

| Feature / Action | Admin | Manager | Worker |
| :--- | :---: | :---: | :---: |
| **Executive Dashboard & KPIs** | ✅ | ✅ | ❌ |
| **View Inventory Items** | ✅ | ✅ | ✅ |
| **Add / Edit Inventory Item** | ✅ | ✅ | ❌ |
| **Adjust Stock (with audit reason)** | ✅ | ✅ | ✅ |
| **View Stock History Audit** | ✅ | ✅ | ✅ |
| **View Orders (Sales & Purchase)** | ✅ | ✅ | ❌ |
| **Create Orders & Dispatch Goods** | ✅ | ✅ | ❌ |
| **View Production Orders** | ✅ | ✅ | ✅ |
| **Create Production Orders** | ✅ | ✅ | ❌ |
| **Advance Production Stage** | ✅ | ✅ | ✅ |
| **Reports & CSV Exports** | ✅ | ✅ | ❌ |

---

## Demo Credentials

Pre-seeded demo accounts available out-of-the-box:

| Role | Business Email | Password | Intended Workflow |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@tranzact.com` | `admin@123` | Full enterprise administrative command |
| **Manager** | `manager@tranzact.com` | `manager@123` | Day-to-day operations across all departments |
| **Worker** | `worker@tranzact.com` | `worker@123` | Shop-floor execution (inventory updates & production tracking) |

---

## Technology Stack

```mermaid
flowchart LR
    subgraph Client ["Frontend (Vite + React 19)"]
        UI["Tailwind CSS v4 & Lucide Icons"]
        Charts["Recharts Visualizations"]
        Router["React Router v7 (RBAC Gated)"]
        Axios["Axios API Client (Bearer Token Interceptor)"]
    end

    subgraph Server ["Backend (Node.js & Express)"]
        Auth["JWT & Bcrypt Authentication"]
        RBAC["allowRoles Middleware"]
        Controllers["Controllers (Items, Orders, Production, Reports)"]
        BOM["BOM Engine & Stock Transitions"]
    end

    subgraph Data ["Database (PostgreSQL / Neon)"]
        Tables["Relational Schema & Foreign Keys"]
        Triggers["Stock Audit Logs & Timelines"]
    end

    Client -->|REST API Requests / JSON| Server
    Server -->|pg Connection Pool / SSL| Data
```

### Frontend
- **Framework:** React 19 + Vite 8
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP Client:** Axios (with unified baseURL, request/response interceptors, and 401 auto-logout)

### Backend
- **Runtime:** Node.js (v18+)
- **Server:** Express.js 4.21
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) + `bcrypt`
- **Database Driver:** `pg` (node-postgres with SSL connection pooling)
- **Cross-Origin:** `cors` configured for local development and cloud deployments (`.vercel.app`)

### Database
- **Engine:** PostgreSQL 16 (Hosted on Neon Serverless)
- **Features:** Foreign keys with cascades, transaction safety (`BEGIN / COMMIT / ROLLBACK`), and audit history tables.

---

## Project Architecture

```text
Tranzact-erp/
├── frontend/                  # React 19 + Vite client application
│   ├── public/
│   │   └── favicon.svg        # TranZact ERP brand icon
│   ├── src/
│   │   ├── components/        # Shared components (Drawer, Modal, StatusBadge, Layout)
│   │   ├── modules/           # Domain sub-components (orders, production)
│   │   ├── pages/             # Route pages (Dashboard, Inventory, Orders, Production, Reports, Login)
│   │   ├── services/          # API client and HTTP request utilities
│   │   ├── utils/             # Helper utilities (CSV exporter, date formatters)
│   │   ├── App.jsx            # Route definitions and role access wrappers
│   │   └── main.jsx           # Application entrypoint
│   ├── index.html             # HTML template with TranZact ERP branding
│   ├── vercel.json            # Vercel SPA routing rewrite configuration
│   └── package.json           # Frontend dependencies and build scripts
│
├── backend/                   # Node.js + Express REST API
│   ├── src/
│   │   ├── config/            # Database pool connection (db.js)
│   │   ├── controllers/       # Business logic (auth, items, orders, production, reports)
│   │   ├── middleware/        # Auth verification and RBAC guards (auth.js)
│   │   ├── routes/            # Express route routers
│   │   └── server.js          # Express app initialization, CORS, and health endpoints
│   ├── package.json           # Backend dependencies and start scripts
│   └── .env.example           # Backend environment template
│
├── database/                  # Database management scripts
│   ├── schema.sql             # Relational DDL tables, indexes, and constraints
│   └── seed.sql               # Seed data for users, initial items, and sample orders
│
├── docs/                      # Architectural documentation and wireframes
│   ├── api-specification.md   # Detailed REST API documentation for all 15 endpoints
│   ├── architecture.md        # UI/UX design specifications and style guide
│   └── database-design.md     # Entity Relationship diagrams and table schemas
│
└── README.md                  # Project documentation
```

---

## Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)
- PostgreSQL database (local instance or cloud instance like [Neon](https://neon.tech/))

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Nihal2705/Tranzact-erp.git
cd Tranzact-erp
```

---

### Step 2: Database Setup
1. Create a new PostgreSQL database (e.g. `tranzact_erp`).
2. Run the database migration and seed scripts:
```bash
psql -d tranzact_erp -f database/schema.sql
psql -d tranzact_erp -f database/seed.sql
```

---

### Step 3: Backend Setup
1. Navigate to the `backend/` directory:
```bash
cd backend
npm install
```
2. Create a `.env` file in `backend/`:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/tranzact_erp
JWT_SECRET=your_jwt_secret_key_here
FRONTEND_URL=http://localhost:5173
```
3. Start the backend API server:
```bash
npm run dev
# Server will start on http://localhost:5000
```
Verify the server by visiting `http://localhost:5000/api/health`.

---

### Step 4: Frontend Setup
1. Open a new terminal and navigate to `frontend/`:
```bash
cd frontend
npm install
```
2. Start the Vite development server:
```bash
npm run dev
# Frontend will start on http://localhost:5173
```
3. Open your browser at `http://localhost:5173` and sign in using one of the demo credentials.

---

## API Specification

All protected endpoints require an `Authorization: Bearer <token>` header.

### 1. Authentication
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user and returns JWT token + user profile |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user details |

### 2. Inventory Management
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/items` | All | Fetch all inventory items (supports `?search=` filter) |
| `GET` | `/api/items/low-stock` | All | Fetch items with quantity below `low_stock_limit` |
| `POST` | `/api/items` | Admin, Manager | Add a new inventory item with opening stock |
| `PUT` | `/api/items/:id` | Admin, Manager | Edit item details (name, unit, price, low stock limit) |
| `PUT` | `/api/items/:id/stock` | All | Adjust item stock with mandatory reason and audit entry |
| `GET` | `/api/items/:id/history` | All | Fetch chronological stock adjustment history |

### 3. Orders Management
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders` | Admin, Manager | Fetch all orders (supports `?order_type=SALES/PURCHASE`) |
| `POST` | `/api/orders` | Admin, Manager | Create a new multi-line order |
| `GET` | `/api/orders/:id` | Admin, Manager | Fetch order details including line items |
| `PUT` | `/api/orders/:id/status` | Admin, Manager | Update invoice status or dispatch/receive goods |
| `GET` | `/api/orders/:id/timeline`| Admin, Manager | Fetch order lifecycle event timeline |

### 4. Production Management
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/production` | All | Fetch all production orders with BOM materials |
| `POST` | `/api/production` | Admin, Manager | Create a new `PLANNED` production order |
| `GET` | `/api/production/:id` | All | Fetch production order details and required materials |
| `PUT` | `/api/production/:id/status`| All | Advance production status and deduct BOM stock |

### 5. Reports & Analytics
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reports/summary` | Admin, Manager | Aggregated KPI stats, chart datasets, and critical lists |

*For full request/response schemas, error handling codes, and payloads, consult [docs/api-specification.md](docs/api-specification.md).*

---

## Deployment Guide

### Deploying the Backend (Render / Railway)
1. Link your GitHub repository (`Nihal2705/Tranzact-erp`) to [Render](https://render.com/).
2. Select **Web Service** with **Root Directory**: `backend`.
3. Set **Build Command**: `npm install`.
4. Set **Start Command**: `npm start`.
5. Add Environment Variables:
   - `DATABASE_URL`: Cloud PostgreSQL connection string (e.g. Neon)
   - `JWT_SECRET`: Secure random string
   - `FRONTEND_URL`: URL of the deployed frontend (e.g. `https://your-app.vercel.app`)

### Deploying the Frontend (Vercel)
1. Import your GitHub repository in [Vercel](https://vercel.com/).
2. Select **Vite** framework preset with **Root Directory**: `frontend`.
3. Build Settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: Your live backend API URL (e.g. `https://your-backend.onrender.com/api`)
5. Deploy. The committed `frontend/vercel.json` rewrite configuration ensures all direct client-side routes (`/dashboard`, `/inventory`, `/orders`, `/production`, `/reports`) load seamlessly without 404 errors.

---

## Team Responsibilities

| Person | Focus Area | Deliverables |
| :--- | :--- | :--- |
| **Person 1** | UI/UX & Documentation | Design system, wireframes, style guide, architecture docs |
| **Person 2** | Inventory Frontend | Inventory catalog, stock adjustment forms, history modals |
| **Person 3** | Orders & Production Frontend | Orders & production dashboards, drawer forms, detail pages |
| **Person 4** | Backend APIs & Integration | Express REST endpoints, BOM logic, route wiring, integration fixes |
| **Person 5** | Database & Security | PostgreSQL DDL schema, seed data, JWT auth, RBAC middleware |
| **Person 6** | Analytics, Testing & QA | Dashboard KPI charts, reports registers, CSV export, test suites |

---

## License

This project is licensed under the [MIT License](LICENSE).
