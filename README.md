# Mini ERP + CRM Operations Portal

> **Full-Stack Monorepo**: Node.js + TypeScript + Express.js API, PostgreSQL with Prisma ORM, React + Vite + Tailwind CSS Frontend, PDF Invoice Engine, AWS S3 Product Image Uploads, Docker Compose, Terraform Infrastructure-as-Code (`/infra`), and GitHub Actions CI/CD.

---

## 1. Project Overview & Architecture Diagram

The **Mini ERP + CRM Operations Portal** is an end-to-end management platform designed for wholesale and distribution companies. It unifies client CRM management, inventory tracking with low-stock alerts, and a sales challan workflow powered by **atomic database transactions** that guarantee inventory integrity.

```
                   +---------------------------------------+
                   |       React + Tailwind Frontend       |
                   |   (CloudFront CDN / Local Static)     |
                   +-------------------+-------------------+
                                       |
                                REST API (JWT)
                                       v
                   +-------------------+-------------------+
                   |     Express.js + TypeScript API       |
                   |      (AWS ECS Fargate / Docker)       |
                   +---------+-------------------+---------+
                             |                   |
            Prisma $transaction                  | S3 SDK / Local Disk
                             v                   v
            +----------------+----+     +--------+--------+
            |  AWS RDS Postgres   |     | AWS S3 Bucket   |
            |  (mini_erp_db)      |     | (Product Images)|
            +---------------------+     +-----------------+
```

### Key Architectural Highlights:
- **Transactional Inventory Guard**: When confirming a Sales Challan (`POST /challans/:id/confirm`), a single Prisma `$transaction` re-verifies requested quantities against real-time database stock. If stock is insufficient, the transaction rolls back completely and returns HTTP 400 with a detailed breakdown of short items.
- **Line Item Snapshotting**: Challan line items snapshot the product name, SKU, and unit price at the time of sale (`productName`, `productSku`, `unitPrice`), decoupling historical billing from future product catalog edits.
- **Dynamic Image Storage**: Uploads product images using `@aws-sdk/client-s3`. When AWS credentials are not set locally, the backend seamlessly falls back to storing uploaded images in `/uploads` and serving them via Express static middleware.
- **PDF Invoice Generation**: On Challan confirmation, `pdfkit` dynamically compiles a formatted PDF invoice complete with billing details, line items, and grand totals (`GET /challans/:id/invoice`).

---

## 2. Tech Stack

- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM, JWT, Bcrypt, Zod, Multer, PDFKit, AWS SDK v3
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React Icons, Axios, React Router v6
- **Database**: PostgreSQL 15
- **AWS Infrastructure**: ECS Fargate, Application Load Balancer (ALB), RDS PostgreSQL, S3 Bucket, CloudFront CDN, Secrets Manager, VPC Networking
- **IaC & CI/CD**: Terraform (`/infra`), Docker, Docker Compose, GitHub Actions (`.github/workflows/ci.yml`)

---

## 3. Server & Monorepo Setup

The repository is structured as a clean monorepo:
```
mini-erp-crm/
├── backend/            # Express API, Prisma schema & seed script, PDF generator
├── frontend/           # React + Tailwind dashboard application
├── infra/              # Terraform Infrastructure-as-Code for AWS deployment
├── postman/            # Exported Postman API collection
├── .github/workflows/  # CI/CD pipeline definition
├── docker-compose.yml  # Local multi-container orchestration
├── .env.example        # Environment variable template
└── README.md           # Documentation
```

---

## 4. Environment Variables Reference

| Variable Name | Description | Default / Example Value |
|---|---|---|
| `PORT` | HTTP port for the backend server | `5000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/mini_erp_db?schema=public` |
| `JWT_SECRET` | Secret key for signing access JWT tokens | `super-secret-jwt-key-minierp-2026` |
| `JWT_EXPIRES_IN` | Access token lifespan | `1d` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `super-secret-refresh-jwt-key-minierp-2026` |
| `FRONTEND_URL` | Origin URL for CORS configuration | `http://localhost:5173` |
| `VITE_API_URL` | Backend API base URL for frontend | `http://localhost:5000/api` |
| `AWS_REGION` | AWS Deployment region | `us-east-1` |
| `AWS_S3_BUCKET` | S3 bucket name for product images & PDFs | `mini-erp-assets-bucket` |
| `AWS_ACCESS_KEY_ID` | AWS IAM Access Key ID | Optional (Falls back to local storage) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM Secret Access Key | Optional (Falls back to local storage) |

---

## 5. How to Run Locally

### Option A: One-Command Docker Compose (Recommended)
```bash
# Spin up PostgreSQL, Backend API, and Frontend Web Server simultaneously
docker-compose up --build
```
Access the application at:
- **Frontend Dashboard**: `http://localhost:80`
- **Backend API**: `http://localhost:5000/api`
- **API Healthcheck**: `http://localhost:5000/health`

### Option B: Local Node.js Development Mode

1. **Install Dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Setup PostgreSQL & Seed Database**:
   Make sure PostgreSQL is running locally on port 5432 with database `mini_erp_db`.
   ```bash
   cd backend
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

3. **Start Backend Dev Server**:
   ```bash
   cd backend
   npm run dev
   # Runs on http://localhost:5000
   ```

4. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:5173
   ```

---

## 6. AWS Deployment Guide (Terraform IaC)

The `/infra` directory contains complete, reproducible Terraform Infrastructure-as-Code.

### Prerequisites:
1. Install [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) and [AWS CLI](https://aws.amazon.com/cli/).
2. Authenticate AWS CLI: `aws configure`.

### Step-by-Step Deployment:
```bash
cd infra

# Initialize Terraform plugins
terraform init

# Review execution plan
terraform plan -var="db_password=YourSecurePassword123!" -var="jwt_secret=YourSecureJwtSecretKey"

# Provision AWS Infrastructure (RDS, ECS, ALB, S3, CloudFront, Secrets Manager)
terraform apply -var="db_password=YourSecurePassword123!" -var="jwt_secret=YourSecureJwtSecretKey" -auto-approve
```

### Outputs Generated:
- `alb_dns_name`: Public load balancer URL for backend API requests.
- `cloudfront_domain_name`: Global CDN distribution URL for static web app and media assets.
- `s3_bucket_name`: S3 storage bucket name.
- `rds_endpoint`: PostgreSQL database endpoint.

---

## 7. Test Login Credentials for All 4 Roles

The seed script creates four test user accounts (one per RBAC role). All test accounts share the default password: **`Password123!`**.

| Role | Name | Email | Password | Allowed Access Summary |
|---|---|---|---|---|
| **Admin** | System Admin | `admin@minierp.com` | `Password123!` | **Full Access**: All CRM, Inventory, Challans, and System metrics |
| **Sales** | Sarah Sales Manager | `sales@minierp.com` | `Password123!` | CRM Customer CRUD, Notes, View Products, Create/Edit/Confirm/Cancel Challans |
| **Warehouse** | Wayne Warehouse Manager | `warehouse@minierp.com` | `Password123!` | Product CRUD, S3 Image Uploads, Manual Stock IN/OUT Movements, View Confirmed Challans |
| **Accounts** | Alex Accounts Manager | `accounts@minierp.com` | `Password123!` | View Customers, View Products, View Challans, Download PDF Invoices, View Financial Metrics |

---

## 8. API Reference & Postman Collection

The Postman Collection is saved at [`/postman/collection.json`](file:///C:/Users/irann/.gemini/antigravity/scratch/mini-erp-crm/postman/collection.json).

### Core Endpoints Summary:
- `POST /api/auth/login` — Login & receive JWT access token.
- `GET /api/auth/me` — Current user profile.
- `GET /api/dashboard/stats` — KPI analytics & low stock counts.
- `POST /api/customers` — Create customer profile (`Admin`, `Sales`).
- `GET /api/customers` — List customers with pagination (`?page=1&limit=10&q=Apex&status=ACTIVE`).
- `GET /api/customers/:id` — Customer profile with follow-up notes history timeline.
- `POST /api/customers/:id/notes` — Append follow-up note (`Admin`, `Sales`).
- `POST /api/products` — Create product with multipart image upload (`Admin`, `Warehouse`).
- `GET /api/products` — List products with low stock alert flags (`?lowStock=true`).
- `POST /api/products/:id/stock-movement` — Record manual IN/OUT stock movement in DB transaction (`Admin`, `Warehouse`).
- `GET /api/products/:id/stock-log` — Product stock movement audit log trail.
- `POST /api/challans` — Create Draft sales challan with line item snapshot (`Admin`, `Sales`).
- `POST /api/challans/:id/confirm` — Atomic DB transaction: verify stock, decrement inventory, write OUT stock log, and generate PDF invoice (`Admin`, `Sales`).
- `GET /api/challans/:id/invoice` — Download generated PDF invoice.
- `POST /api/challans/:id/cancel` — Cancel challan & restore inventory if confirmed (`Admin`, `Sales`).

---

## 9. PDF Invoice & Image Upload Mechanics

1. **Product Image Upload**:
   - Uses `multer` memory storage middleware.
   - If AWS S3 credentials are configured in `.env`, uploads image buffer to S3 using `@aws-sdk/client-s3` and returns the S3/CloudFront URL.
   - If AWS credentials are missing (local dev mode), saves to `/uploads` directory and serves via Express static middleware.

2. **PDF Invoice Generator**:
   - Implemented using `pdfkit` in `src/services/pdfService.ts`.
   - On Challan confirmation, generates a formatted A4 invoice PDF including company branding, customer details, line items table with price snapshots, tax breakdown, and grand totals.

---

## 10. Assumptions Made

1. **Currency**: All monetary values are recorded and rendered in USD ($) formatted to two decimal places.
2. **Product SKU Uniqueness**: SKUs are strictly unique across the database, converted to uppercase, and indexed.
3. **Sequential Challans**: Challan numbers are auto-generated as `CH-YYYY-XXXX` per calendar year.
4. **Permissions**: Role-based access control (RBAC) is strictly enforced on every route.

---

## 11. Known Limitations & Future Roadmap

1. **Automated Unit Test Coverage**: Core business logic (stock deduction and rollbacks) is thoroughly tested via seed transactions, but formal Jest/Supertest suite integration can be added.
2. **Multi-Warehouse Transfers**: Currently supports a single warehouse location string per product. Multi-location transfer logs can be added in future iterations.
3. **Email Notification Engine**: Invoice PDFs are downloadable via REST API; SMTP dispatch for automatic email delivery to customer addresses can be attached.
