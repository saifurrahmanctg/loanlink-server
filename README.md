---
---

# 📕 Backend – `README.md`

````md
# 🚀 LoanLink Backend API

RESTful backend API for the **LoanLink Micro-Loan Management System**, built with **Node.js**, **Express**, and **MongoDB**, providing secure and scalable services for loan management.

---

## 🧰 Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB**
- **MongoDB Atlas**
- **dotenv**
- **CORS**

---

## 📦 Database Collections

```text
users
loans
loanApplications
```
````

## 🔐 User Roles

- Admin
- Manager
- Borrower

Roles are stored in the users collection and used for authorization on the frontend.

---

## 🛣️ API Routes

## 👤 User Routes

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| POST   | `/users`             | Create user         |
| GET    | `/users`             | Get all users       |
| GET    | `/users/:email`      | Get user by email   |
| PATCH  | `/users/role/:email` | Update user role    |
| DELETE | `/users/:id/suspend` | Delete/Suspend user |

---

## 💳 Loan Routes

| Method | Endpoint          | Description    |
| ------ | ----------------- | -------------- |
| POST   | `/loans`          | Add new loan   |
| GET    | `/loans`          | Get all loans  |
| GET    | `/loans/:id`      | Get loan by ID |
| PATCH  | `/loans/:id`      | Update loan    |
| PATCH  | `/loans/home/:id` | Show on home   |
| DELETE | `/loans/:id`      | Delete loan    |

---

## 📄 Loan Application Routes

| Method | Endpoint                             | Description          |
| ------ | ------------------------------------ | -------------------- |
| POST   | `/loan-applications`                 | Apply for loan       |
| GET    | `/loan-applications`                 | Get all applications |
| GET    | `/loan-applications/user/:email`     | Borrower’s loans     |
| GET    | `/loan-applications/status/pending`  | Pending loans        |
| GET    | `/loan-applications/status/approved` | Approved loans       |
| PATCH  | `/loan-applications/:id`             | Update status        |
| DELETE | `/loan-applications/:id`             | Delete application   |
