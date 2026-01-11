# 🚀 LoanLink Backend API

A high-performance RESTful API for the **LoanLink Micro-Loan Management System**. Built with **Node.js**, **Express**, and **MongoDB**, this server handles secure role-based data aggregation and comprehensive financial reporting.

---

## 🧰 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Security**: CORS, Dotenv
- **Utilities**: MongoDB Aggregation Pipelines

---

## 🔐 Advanced Role Integration

The API serves three distinct user tiers, providing role-specific data payloads:
- **Admin**: Global platform statistics and user demographic oversight.
- **Manager**: Targeted loan product performance and application workflows.
- **Borrower**: Personalized financial summaries and status tracking.

---

## 📊 Dashboard Intelligence

The server features a complex aggregation endpoint that dynamically calculates platform health:
- **Financial Disbursement**: Sums `loanAmount` from approved applications.
- **User Demographics**: Real-time counts of Admins, Managers, and Borrowers.
- **Application Flow**: Global tracking of Pending vs. Approved loan statuses.

---

## 🛣️ API Endpoints

### 📊 Statistical Reporting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats/:email` | Dynamic role-based platform stats |

### 👤 User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create/Sync user |
| GET | `/users` | Retrieve all users |
| GET | `/users/:email` | Fetch specific user profile |
| PATCH | `/users/role/:email` | Role elevation/reduction |
| DELETE | `/users/:id/suspend` | Account suspension |

### 💳 Loan Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/loans` | Create new loan product |
| GET | `/loans` | List all available loans |
| GET | `/loans/:id` | Detailed product view |
| PATCH | `/loans/:id` | Update product terms |
| PATCH | `/loans/home/:id` | Toggle homepage visibility |
| DELETE | `/loans/:id` | Product decommissioning |

### 📄 Loan Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/loan-applications` | Submit new application |
| GET | `/loan-applications` | Global application history |
| GET | `/loan-applications/user/:email` | User-specific application history |
| GET | `/loan-applications/status/pending` | Triage pending reviews |
| GET | `/loan-applications/status/approved` | Track disbursed capital |
| PATCH | `/loan-applications/:id` | Approve/Reject workflow |
| DELETE | `/loan-applications/:id` | Purge application records |

---

## ⚙️ Local Configuration

1. Install dependencies: `npm install`
2. Environment Setup (`.env`):
   ```bash
   DB_USER=your_user
   DB_PASS=your_pass
   PORT=3000
   ```
3. Boot Server: `npm start`
