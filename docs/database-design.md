# Database Design
## TranZact ERP Project — Person 5

---

## 1. Overview

This document describes the database design for the TranZact-style ERP project.
The database is PostgreSQL, hosted on Neon.
It stores all data for Inventory, Orders, Production and Reports.

---

## 2. Tables and Relationships

### 2.1 roles
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| name | VARCHAR(20) | Unique, Not Null |

**Values:** Admin, Manager, Worker

---

### 2.2 users
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| name | VARCHAR(100) | Not Null |
| email | VARCHAR(150) | Unique, Not Null |
| password_hash | TEXT | Not Null (bcrypt) |
| role_id | INT | Foreign Key → roles.id |
| created_at | TIMESTAMPTZ | Default now() |

---

### 2.3 items
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| name | VARCHAR(150) | Unique, Not Null |
| item_type | VARCHAR(10) | 'RAW' or 'FINISHED' |
| unit | VARCHAR(20) | Not Null |
| quantity | NUMERIC(12,2) | Default 0, >= 0 |
| price | NUMERIC(12,2) | >= 0 |
| low_stock_limit | NUMERIC(12,2) | Default 0, >= 0 |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |

---

### 2.4 bom_lines
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| finished_item_id | INT | Foreign Key → items.id |
| raw_item_id | INT | Foreign Key → items.id |
| qty_per_unit | NUMERIC(12,3) | > 0 |

---

### 2.5 orders
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| order_type | VARCHAR(10) | 'SALES' or 'PURCHASE' |
| party_name | VARCHAR(150) | Not Null |
| order_date | DATE | Not Null |
| due_date | DATE | Nullable |
| invoice_status | VARCHAR(20) | 'Pending' or 'Created' |
| goods_status | VARCHAR(25) | 'Not Dispatched', 'Partially Dispatched', 'Dispatched' |
| total_amount | NUMERIC(14,2) | Nullable |
| created_by | INT | Foreign Key → users.id |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |

---

### 2.6 order_items
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| order_id | INT | Foreign Key → orders.id (CASCADE DELETE) |
| item_id | INT | Foreign Key → items.id |
| quantity | NUMERIC(12,2) | > 0 |
| price | NUMERIC(12,2) | >= 0 |
| fulfilled_qty | NUMERIC(12,2) | Default 0 |

---

### 2.7 production_orders
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| finished_item_id | INT | Foreign Key → items.id |
| target_qty | NUMERIC(12,2) | > 0 |
| completed_qty | NUMERIC(12,2) | Default 0 |
| status | VARCHAR(15) | PLANNED → PENDING → WIP → IN-TESTING → COMPLETED |
| planned_date | DATE | Nullable |
| total_cost | NUMERIC(14,2) | Nullable |
| created_by | INT | Foreign Key → users.id |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |
| completed_at | TIMESTAMPTZ | Nullable |

---

### 2.8 stock_history
| Column | Type | Rules |
|--------|------|-------|
| id | SERIAL | Primary Key |
| item_id | INT | Foreign Key → items.id |
| change_qty | NUMERIC(12,2) | Not 0 |
| balance_after | NUMERIC(12,2) | Not Null |
| changed_via | VARCHAR(30) | See values below |
| reason | TEXT | Nullable |
| unit_cost | NUMERIC(12,2) | Nullable |
| order_id | INT | Foreign Key → orders.id (Nullable) |
| production_order_id | INT | Foreign Key → production_orders.id (Nullable) |
| changed_by | INT | Foreign Key → users.id |
| request_id | VARCHAR(64) | Prevents duplicate stock changes |
| created_at | TIMESTAMPTZ | Default now() |

**changed_via values:** Opening Stock, Manual Adjustment, Sales Dispatch, Purchase Inward, Production Consumption, Production Output

---

## 3. Test Login Accounts

> These are test accounts only. Do not use in production.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@tranzact.com | Admin@123 |
| Manager | manager@tranzact.com | Manager@123 |
| Worker | worker@tranzact.com | Worker@123 |

---

## 4. Backup Instructions

**Take a backup every week:**
```
pg_dump "YOUR_DATABASE_URL" > erp_backup_2026-11-11.sql
```

**Restore from backup:**
```
psql "YOUR_DATABASE_URL" < erp_backup_2026-11-11.sql
```

Store backup files in team Google Drive, NOT in GitHub.

---

## 5. Security Notes

- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens valid for 8 hours
- Wrong email or password → same error message always
- .env file never uploaded to GitHub
- Database URL shared privately only
