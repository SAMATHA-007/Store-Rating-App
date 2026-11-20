# FullStack Intern Coding Challenge
Stack: React + Vite, Node.js + Express, MySQL.

## Setup
1. Create database `store_ratings` in MySQL Workbench.
2. Run `backend/schema.sql`.
3. In `backend`, copy `.env.example` to `.env`, update MySQL credentials and JWT_SECRET.
4. Run `npm install`, then `npm run seed`, then `npm run dev`.
5. In `frontend`, run `npm install` and `npm run dev`.
6. Open http://localhost:5173.

Seeded admin: admin@example.com / Admin@123 (change it after login).

Public signup always creates USER role. Admin can create users and stores. Set Owner User ID when creating a store to assign it to an OWNER account.
