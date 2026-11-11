-- ROLES
INSERT INTO roles (name) VALUES
  ('Admin'),
  ('Manager'),
  ('Worker');

INSERT INTO users (name, email, password_hash, role_id) VALUES
  ('Alice Admin',  'admin@tranzact.com',   $2b$10$dDrri.uTzjHkQ0X2bn1a..0ykyrlANdTcR0LfaSZQIgeZ3It9aic6,   1),
  ('Mark Manager', 'manager@tranzact.com', $2b$10$CDOVT5VzYGf1B0sd1p/NO.WQjn4C.4cWhD2t3DOA3dTEOylm/qJe2, 2),
  ('Wendy Worker', 'worker@tranzact.com',  $2b$10$sYhwKDBgkhMgvjCbTcj9QOp5lZdwpgWLInVkFw1KkN3vPr6pzQ6mm,  3);

-- ITEMS (Raw)
INSERT INTO items (name, item_type, unit, quantity, price, low_stock_limit) VALUES
  ('Steel Rod',     'RAW', 'kg',   500,  120.00, 100),
  ('Rubber Seal',   'RAW', 'pcs',  200,   15.00,  50),
  ('Bolt M10',      'RAW', 'pcs', 1000,    2.50, 200),
  ('Copper Pipe',   'RAW', 'mtr',   80,   95.00,  30),
  ('Paint (Black)', 'RAW', 'ltr',   40,   60.00,  20),
  ('Steel Sheet',   'RAW', 'kg',   300,  150.00,  80),
  ('Spring',        'RAW', 'pcs',   25,   18.00,  50),  -- below low_stock
  ('Lubricant Oil', 'RAW', 'ltr',   10,   45.00,  30);  -- below low_stock

-- ITEMS (Finished)
INSERT INTO items (name, item_type, unit, quantity, price, low_stock_limit) VALUES
  ('Globe Valve',     'FINISHED', 'pcs', 50,  850.00, 10),
  ('Butterfly Valve', 'FINISHED', 'pcs', 30,  620.00, 10),
  ('Relief Valve',    'FINISHED', 'pcs', 15,  970.00, 20),  -- below low_stock
  ('Cylinder Valve',  'FINISHED', 'pcs', 40, 1100.00, 10);

-- BOM LINES
INSERT INTO bom_lines (finished_item_id, raw_item_id, qty_per_unit) VALUES
  (9,  1, 2.000),
  (9,  2, 1.000),
  (9,  3, 4.000),
  (10, 1, 1.500),
  (10, 2, 2.000),
  (10, 5, 0.200),
  (11, 6, 1.000),
  (11, 7, 1.000),
  (11, 3, 6.000),
  (12, 4, 0.500),
  (12, 2, 2.000),
  (12, 8, 0.100);

-- ORDERS
INSERT INTO orders (order_type, party_name, order_date, due_date, invoice_status, goods_status, total_amount, created_by) VALUES
  ('SALES',    'ABC Industries',  '2026-10-01', '2026-10-15', 'Created', 'Dispatched',           42500.00, 1),
  ('SALES',    'XYZ Corp',        '2026-10-10', '2026-10-25', 'Pending', 'Partially Dispatched', 19400.00, 2),
  ('SALES',    'Delta Machines',  '2026-09-20', '2026-10-05', 'Pending', 'Not Dispatched',       33000.00, 2),
  ('PURCHASE', 'Steel Suppliers', '2026-10-05', '2026-10-20', 'Created', 'Dispatched',           36000.00, 1),
  ('PURCHASE', 'Rubber World',    '2026-10-12', '2026-10-28', 'Pending', 'Partially Dispatched',  4500.00, 2),
  ('PURCHASE', 'Bolt Masters',    '2026-10-15', '2026-11-01', 'Pending', 'Not Dispatched',        2500.00, 1);

-- ORDER ITEMS
INSERT INTO order_items (order_id, item_id, quantity, price, fulfilled_qty) VALUES
  (1,  9, 50,   850.00, 50),
  (2, 10, 30,   620.00, 15),
  (3, 11, 34,   970.00,  0),
  (4,  1, 300,  120.00, 300),
  (5,  2, 300,   15.00, 100),
  (6,  3, 1000,   2.50,  0);

-- PRODUCTION ORDERS
INSERT INTO production_orders (finished_item_id, target_qty, completed_qty, status, planned_date, total_cost, created_by) VALUES
  (10, 10, 10, 'COMPLETED', '2026-10-01', 4024.39, 1),
  (9,  20, 12, 'WIP',       '2026-10-20', NULL,    2),
  (11,  5,  0, 'PENDING',   '2026-11-01', NULL,    2),
  (12,  8,  0, 'PLANNED',   '2026-11-15', NULL,    1);

-- STOCK HISTORY
INSERT INTO stock_history (item_id, change_qty, balance_after, changed_via, reason, changed_by) VALUES
  (1,   500,  500, 'Opening Stock', 'Initial stock', 1),
  (2,   200,  200, 'Opening Stock', 'Initial stock', 1),
  (3,  1000, 1000, 'Opening Stock', 'Initial stock', 1),
  (4,    80,   80, 'Opening Stock', 'Initial stock', 1),
  (5,    40,   40, 'Opening Stock', 'Initial stock', 1),
  (6,   300,  300, 'Opening Stock', 'Initial stock', 1),
  (7,    25,   25, 'Opening Stock', 'Initial stock', 1),
  (8,    10,   10, 'Opening Stock', 'Initial stock', 1),
  (9,    50,   50, 'Opening Stock', 'Initial stock', 1),
  (10,   30,   30, 'Opening Stock', 'Initial stock', 1),
  (11,   15,   15, 'Opening Stock', 'Initial stock', 1),
  (12,   40,   40, 'Opening Stock', 'Initial stock', 1);
