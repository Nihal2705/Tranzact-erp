# TranZact-style ERP — API Specification

**Author:** Person 4 – Backend Developer – APIs  
**Base URL:** `http://localhost:5000/api`  
**Data Format:** JSON (`application/json`)  
**Naming Convention:** `snake_case` for all JSON keys  
**Authentication Scheme:** `Authorization: Bearer <token>` (JWT containing `{ id, role }`, valid for 8 hours)

---

## 1. Overview & General Standards

### 1.1 Roles & Permissions Matrix
The system enforces strict role-based access control (RBAC) on the backend:
- **Admin**: Full access to all endpoints.
- **Manager**: Access to Inventory, Orders, Production, and Reports.
- **Worker**: View Inventory, change Stock quantity (with reason), view Stock history, view Production orders, and update Production status/progress. Workers **cannot** create or edit items, view or modify orders, create production orders, or access reports.

| Endpoint Group | Method & Path | Admin | Manager | Worker |
|---|---|:---:|:---:|:---:|
| **Auth** | `POST /api/auth/login` | Yes | Yes | Yes (Public) |
| **Inventory** | `GET /api/items` | Yes | Yes | Yes |
| | `POST /api/items` | Yes | Yes | No |
| | `PUT /api/items/:id` | Yes | Yes | No |
| | `PUT /api/items/:id/stock` | Yes | Yes | Yes |
| | `GET /api/items/:id/history` | Yes | Yes | Yes |
| | `GET /api/items/low-stock` | Yes | Yes | Yes |
| **Orders** | `GET /api/orders` | Yes | Yes | No |
| | `POST /api/orders` | Yes | Yes | No |
| | `PUT /api/orders/:id/status` | Yes | Yes | No |
| | `GET /api/orders/:id/timeline` | Yes | Yes | No |
| **Production** | `GET /api/production` | Yes | Yes | Yes |
| | `POST /api/production` | Yes | Yes | No |
| | `PUT /api/production/:id/status` | Yes | Yes | Yes |
| **Reports** | `GET /api/reports/summary` | Yes | Yes | No |

### 1.2 Standard Error Response Shape
All error responses adhere to a consistent JSON structure:
```json
{
  "error": "Human-readable description of error"
}
```

Standard HTTP status codes utilized:
- `200 OK`: Successful read or update operation.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input validation failure, business rule violation, or insufficient stock.
- `401 Unauthorized`: Missing, expired, or invalid JWT token.
- `403 Forbidden`: Authenticated user role does not possess permissions for this action.
- `404 Not Found`: Requested resource ID does not exist.
- `409 Conflict`: Duplicate entry (e.g. duplicate item name) or invalid state transition.
- `500 Internal Server Error`: Unexpected server exception.

---

## 2. Authentication API

### 2.1 User Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public (No token required)
- **Description:** Authenticates user credentials using bcrypt and returns an 8-hour JWT token with user details.

#### Request Body
```json
{
  "email": "admin@tranzact.com",
  "password": "admin@123"
}
```

#### Success Response (`200 OK`)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Alice Admin",
    "email": "admin@tranzact.com",
    "role": "Admin"
  }
}
```

#### Error Responses
- `400 Bad Request`: `{"error": "Email and password are required"}`
- `401 Unauthorized`: `{"error": "Invalid email or password"}`

---

## 3. Inventory APIs

### 3.1 List Items
- **Endpoint:** `GET /api/items`
- **Access:** Admin, Manager, Worker
- **Query Parameters:**
  - `search` *(optional)*: Filter items by name (case-insensitive substring)

#### Success Response (`200 OK`)
```json
[
  {
    "id": 1,
    "name": "Steel Rod",
    "item_type": "RAW",
    "unit": "kg",
    "quantity": 500.00,
    "price": 120.00,
    "low_stock_limit": 100.00,
    "is_low_stock": false,
    "bom": []
  },
  {
    "id": 9,
    "name": "Globe Valve",
    "item_type": "FINISHED",
    "unit": "pcs",
    "quantity": 50.00,
    "price": 850.00,
    "low_stock_limit": 10.00,
    "is_low_stock": false,
    "bom": [
      { "raw_item_id": 1, "raw_item_name": "Steel Rod", "qty_per_unit": 2.000 },
      { "raw_item_id": 2, "raw_item_name": "Rubber Seal", "qty_per_unit": 1.000 },
      { "raw_item_id": 3, "raw_item_name": "Bolt M10", "qty_per_unit": 4.000 }
    ]
  }
]
```

---

### 3.2 Add New Item
- **Endpoint:** `POST /api/items`
- **Access:** Admin, Manager
- **Description:** Adds an item. If `opening_qty > 0`, atomically creates the item and writes an `Opening Stock` row in `stock_history`.

#### Request Body
```json
{
  "name": "Brass Fitting",
  "item_type": "RAW",
  "unit": "pcs",
  "price": 45.00,
  "low_stock_limit": 30.00,
  "opening_qty": 100.00
}
```

#### Success Response (`201 Created`)
```json
{
  "id": 13,
  "name": "Brass Fitting",
  "item_type": "RAW",
  "unit": "pcs",
  "quantity": 100.00,
  "price": 45.00,
  "low_stock_limit": 30.00,
  "created_at": "2026-11-11T20:00:00.000Z",
  "updated_at": "2026-11-11T20:00:00.000Z"
}
```

#### Error Responses
- `400 Bad Request`: Validation failure (empty name, negative numbers, invalid item_type).
- `403 Forbidden`: `{"error": "You do not have permission"}`
- `409 Conflict`: `{"error": "Item with this name already exists"}`

---

### 3.3 Edit Item Details
- **Endpoint:** `PUT /api/items/:id`
- **Access:** Admin, Manager
- **Description:** Updates name, unit, price, and low_stock_limit. Quantity is **never** modified via this endpoint.

#### Request Body
```json
{
  "name": "Steel Rod (Grade A)",
  "unit": "kg",
  "price": 125.00,
  "low_stock_limit": 110.00
}
```

#### Success Response (`200 OK`)
```json
{
  "id": 1,
  "name": "Steel Rod (Grade A)",
  "item_type": "RAW",
  "unit": "kg",
  "quantity": 500.00,
  "price": 125.00,
  "low_stock_limit": 110.00,
  "updated_at": "2026-11-11T20:10:00.000Z"
}
```

#### Error Responses
- `400 Bad Request`: `{"error": "Modifying item quantity via this endpoint is not allowed"}` or invalid numbers.
- `404 Not Found`: `{"error": "Item not found"}`
- `409 Conflict`: `{"error": "Item with this name already exists"}`

---

### 3.4 Change Stock Quantity (Manual Adjustment)
- **Endpoint:** `PUT /api/items/:id/stock`
- **Access:** Admin, Manager, Worker
- **Description:** Adjusts stock quantity (+/-) with mandatory `reason`. Uses row-level lock (`SELECT ... FOR UPDATE`), prevents negative stock, records `stock_history`, and enforces idempotency via `request_id`.

#### Request Body
```json
{
  "change_qty": -10,
  "reason": "Damaged goods discarded",
  "request_id": "c1f7a2d1-5a21-4f11-9fa2-8cb221a60123"
}
```

#### Success Response (`200 OK`)
```json
{
  "item": {
    "id": 1,
    "name": "Steel Rod",
    "quantity": 490.00
  },
  "history_entry": {
    "id": 13,
    "item_id": 1,
    "change_qty": -10.00,
    "balance_after": 490.00,
    "changed_via": "Manual Adjustment",
    "reason": "Damaged goods discarded",
    "changed_by": 1,
    "created_at": "2026-11-11T20:15:00.000Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: `{"error": "Stock cannot go below zero"}` or `{"error": "Reason is required"}`
- `404 Not Found`: `{"error": "Item not found"}`

---

### 3.5 Item Stock History
- **Endpoint:** `GET /api/items/:id/history`
- **Access:** Admin, Manager, Worker
- **Description:** Returns stock movement logs for an item, sorted newest first.

#### Success Response (`200 OK`)
```json
[
  {
    "id": 13,
    "created_at": "2026-11-11T20:15:00.000Z",
    "changed_via": "Manual Adjustment",
    "change_qty": -10.00,
    "balance_after": 490.00,
    "reason": "Damaged goods discarded",
    "changed_by_name": "Alice Admin",
    "order_id": null,
    "production_order_id": null
  },
  {
    "id": 1,
    "created_at": "2026-10-01T10:00:00.000Z",
    "changed_via": "Opening Stock",
    "change_qty": 500.00,
    "balance_after": 500.00,
    "reason": "Initial stock",
    "changed_by_name": "Alice Admin",
    "order_id": null,
    "production_order_id": null
  }
]
```

---

### 3.6 Low Stock Items
- **Endpoint:** `GET /api/items/low-stock`
- **Access:** Admin, Manager, Worker
- **Description:** Returns all items whose `quantity < low_stock_limit`.

#### Success Response (`200 OK`)
```json
[
  {
    "id": 7,
    "name": "Spring",
    "item_type": "RAW",
    "unit": "pcs",
    "quantity": 25.00,
    "price": 18.00,
    "low_stock_limit": 50.00
  },
  {
    "id": 8,
    "name": "Lubricant Oil",
    "item_type": "RAW",
    "unit": "ltr",
    "quantity": 10.00,
    "price": 45.00,
    "low_stock_limit": 30.00
  }
]
```

---

## 4. Orders APIs

### 4.1 List Orders
- **Endpoint:** `GET /api/orders`
- **Access:** Admin, Manager
- **Query Parameters:**
  - `order_type`: `SALES` or `PURCHASE`
  - `invoice_status`: `Pending` or `Created`
  - `goods_status`: `Not Dispatched`, `Partially Dispatched`, or `Dispatched`
  - `search`: Search by customer/supplier party name
  - `from`: Order date range start (`YYYY-MM-DD`)
  - `to`: Order date range end (`YYYY-MM-DD`)

#### Success Response (`200 OK`)
```json
[
  {
    "id": 1,
    "order_type": "SALES",
    "party_name": "ABC Industries",
    "order_date": "2026-10-01",
    "due_date": "2026-10-15",
    "invoice_status": "Created",
    "goods_status": "Dispatched",
    "total_amount": 42500.00,
    "created_by": 1,
    "lines": [
      {
        "id": 1,
        "item_id": 9,
        "item_name": "Globe Valve",
        "quantity": 50.00,
        "price": 850.00,
        "fulfilled_qty": 50.00
      }
    ]
  }
]
```

---

### 4.2 Create Order
- **Endpoint:** `POST /api/orders`
- **Access:** Admin, Manager
- **Description:** Atomically creates an order and its order items inside a single database transaction. Total amount is calculated by the backend. Initial statuses: `invoice_status = 'Pending'`, `goods_status = 'Not Dispatched'`.

#### Request Body
```json
{
  "order_type": "SALES",
  "party_name": "Modern Valves Ltd",
  "order_date": "2026-11-12",
  "due_date": "2026-11-26",
  "lines": [
    { "item_id": 9, "quantity": 10, "price": 850.00 },
    { "item_id": 10, "quantity": 5, "price": 620.00 }
  ]
}
```

#### Success Response (`201 Created`)
```json
{
  "id": 7,
  "order_type": "SALES",
  "party_name": "Modern Valves Ltd",
  "order_date": "2026-11-12",
  "due_date": "2026-11-26",
  "invoice_status": "Pending",
  "goods_status": "Not Dispatched",
  "total_amount": 11600.00,
  "lines": [
    { "id": 7, "item_id": 9, "quantity": 10.00, "price": 850.00, "fulfilled_qty": 0.00 },
    { "id": 8, "item_id": 10, "quantity": 5.00, "price": 620.00, "fulfilled_qty": 0.00 }
  ]
}
```

---

### 4.3 Update Order Status (Invoice & Dispatch/Receive)
- **Endpoint:** `PUT /api/orders/:id/status`
- **Access:** Admin, Manager
- **Description:** Supports creating invoice and/or dispatching goods (Sales) or receiving goods (Purchase). Handles partial and full fulfillment. Updates inventory and records `stock_history` (`Sales Dispatch` or `Purchase Inward`). Automatically updates `goods_status`.

#### Request Body
```json
{
  "invoice_status": "Created",
  "dispatch": [
    { "order_item_id": 7, "qty": 10 },
    { "order_item_id": 8, "qty": 2 }
  ],
  "request_id": "req-dispatch-001"
}
```

#### Success Response (`200 OK`)
```json
{
  "id": 7,
  "invoice_status": "Created",
  "goods_status": "Partially Dispatched",
  "lines": [
    { "id": 7, "item_id": 9, "quantity": 10.00, "fulfilled_qty": 10.00 },
    { "id": 8, "item_id": 10, "quantity": 5.00, "fulfilled_qty": 2.00 }
  ]
}
```

#### Error Responses
- `400 Bad Request`: `{"error": "Cannot dispatch more than remaining quantity"}` or `{"error": "Insufficient stock for item: Globe Valve"}`
- `404 Not Found`: `{"error": "Order not found"}`

---

### 4.4 Order Timeline
- **Endpoint:** `GET /api/orders/:id/timeline`
- **Access:** Admin, Manager
- **Description:** Returns chronological audit events for the order derived from `order_date`, `invoice_created_at`, and `stock_history`.

#### Success Response (`200 OK`)
```json
[
  { "event": "Order Created", "date": "2026-11-12T00:00:00.000Z", "details": "Order placed with Modern Valves Ltd" },
  { "event": "Invoice Created", "date": "2026-11-12T10:30:00.000Z", "details": "Invoice generated" },
  { "event": "Partially Dispatched", "date": "2026-11-12T14:00:00.000Z", "details": "10 of Globe Valve, 2 of Butterfly Valve dispatched" }
]
```

---

## 5. Production APIs

### 5.1 List Production Orders
- **Endpoint:** `GET /api/production`
- **Access:** Admin, Manager, Worker
- **Query Parameters:**
  - `status`: Filter by status (`PLANNED`, `PENDING`, `WIP`, `IN-TESTING`, `COMPLETED`)
  - `from`: Start date
  - `to`: End date

#### Success Response (`200 OK`)
```json
[
  {
    "id": 1,
    "finished_item_id": 10,
    "finished_item_name": "Butterfly Valve",
    "target_qty": 10.00,
    "completed_qty": 10.00,
    "status": "COMPLETED",
    "planned_date": "2026-10-01",
    "total_cost": 4024.39,
    "completed_at": "2026-10-01T15:00:00.000Z",
    "materials": [
      { "raw_item_id": 1, "raw_item_name": "Steel Rod", "qty_needed": 15.00, "qty_in_stock": 500.00 },
      { "raw_item_id": 2, "raw_item_name": "Rubber Seal", "qty_needed": 20.00, "qty_in_stock": 200.00 },
      { "raw_item_id": 5, "raw_item_name": "Paint (Black)", "qty_needed": 2.00, "qty_in_stock": 40.00 }
    ]
  }
]
```

---

### 5.2 Create Production Order
- **Endpoint:** `POST /api/production`
- **Access:** Admin, Manager
- **Description:** Initiates a new production order. The finished item must be of type `FINISHED` and have at least one BOM line. Status starts at `PLANNED`.

#### Request Body
```json
{
  "finished_item_id": 9,
  "target_qty": 20,
  "planned_date": "2026-11-20"
}
```

#### Success Response (`201 Created`)
```json
{
  "id": 5,
  "finished_item_id": 9,
  "target_qty": 20.00,
  "completed_qty": 0.00,
  "status": "PLANNED",
  "planned_date": "2026-11-20",
  "total_cost": null,
  "created_by": 1
}
```

#### Error Responses
- `400 Bad Request`: `{"error": "Item is not a FINISHED good or has no BOM lines defined"}`
- `404 Not Found`: `{"error": "Finished item not found"}`

---

### 5.3 Update Production Order Status & Progress
- **Endpoint:** `PUT /api/production/:id/status`
- **Access:** Admin, Manager, Worker
- **Description:** Progresses status strictly forward: `PLANNED -> PENDING -> WIP -> IN-TESTING -> COMPLETED`.
  - When transitioning to `COMPLETED`:
    1. Checks all required raw materials against current stock.
    2. Atomically consumes raw materials (`Production Consumption`, saving `unit_cost`).
    3. Increases finished good stock (`Production Output`).
    4. Computes `total_cost = sum(raw_qty * unit_cost)`.
    5. Sets `completed_qty = target_qty` and records `completed_at`.
  - Idempotent: Completion cannot happen twice (`409 Conflict`).

#### Request Body
```json
{
  "status": "WIP",
  "completed_qty": 8,
  "request_id": "prod-stage-wip-1"
}
```

#### Success Response (`200 OK`)
```json
{
  "id": 5,
  "status": "WIP",
  "completed_qty": 8.00,
  "target_qty": 20.00
}
```

#### Completion Request Body
```json
{
  "status": "COMPLETED",
  "request_id": "prod-completion-req-5"
}
```

#### Error Responses
- `400 Bad Request`: `{"error": "Invalid status transition. Status can only progress forward: PLANNED -> PENDING -> WIP -> IN-TESTING -> COMPLETED"}` or `{"error": "Insufficient stock for raw material: Steel Rod"}`
- `409 Conflict`: `{"error": "Production order is already COMPLETED"}`

---

## 6. Reports API

### 6.1 Dashboard & KPI Summary
- **Endpoint:** `GET /api/reports/summary`
- **Access:** Admin, Manager
- **Description:** Aggregates top-level operational KPIs, monthly sales trends, inventory valuations by item, production status distribution, active low stock items, and overdue late orders.

#### Success Response (`200 OK`)
```json
{
  "kpis": {
    "stock_value": 254300.00,
    "low_stock_count": 3,
    "orders_this_month": 6,
    "pending_invoices": 4,
    "orders_not_dispatched": 4,
    "production_completed": 1
  },
  "orders_per_month": [
    { "month": "2026-09", "count": 1 },
    { "month": "2026-10", "count": 5 }
  ],
  "stock_by_item": [
    { "name": "Steel Rod", "value": 60000.00 },
    { "name": "Globe Valve", "value": 42500.00 },
    { "name": "Steel Sheet", "value": 45000.00 }
  ],
  "production_by_status": [
    { "status": "PLANNED", "count": 1 },
    { "status": "PENDING", "count": 1 },
    { "status": "WIP", "count": 1 },
    { "status": "COMPLETED", "count": 1 }
  ],
  "low_stock_items": [
    {
      "id": 7,
      "name": "Spring",
      "quantity": 25.00,
      "low_stock_limit": 50.00
    },
    {
      "id": 8,
      "name": "Lubricant Oil",
      "quantity": 10.00,
      "low_stock_limit": 30.00
    },
    {
      "id": 11,
      "name": "Relief Valve",
      "quantity": 15.00,
      "low_stock_limit": 20.00
    }
  ],
  "late_orders": [
    {
      "id": 3,
      "party_name": "Delta Machines",
      "order_type": "SALES",
      "due_date": "2026-10-05",
      "goods_status": "Not Dispatched",
      "total_amount": 33000.00
    }
  ]
}
```

---

## 7. Business Rules Checklist

1. **Atomic Transactions:** Any endpoint altering multiple tables (stock changes, order item creation, order dispatching, production completion) wraps all queries inside `BEGIN ... COMMIT / ROLLBACK`.
2. **Shared Stock Service:** All stock adjustments pass through `stockService.changeStock` using row-level locking (`SELECT ... FOR UPDATE`).
3. **Non-Negative Stock:** Stock balances are prohibited from going below 0. Any attempt immediately rolls back with status `400 Bad Request`.
4. **Idempotency:** Any mutation request accompanied by a `request_id` verifies prior application. Repeated calls return `200 OK` with the existing state without re-decrementing inventory.
5. **Role Gatekeeping:** Routes enforce `requireAuth` and `allowRoles(...)`. Worker accounts attempting Admin/Manager actions receive `403 Forbidden`.

