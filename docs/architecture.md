# UI Design and Style Guide

This document holds the design of every screen in TranZact ERP, the style guide, and the rules for the different roles. Developers should build the screens to match these pictures. Numbers and names in the pictures are sample data.

Related documents: [architecture.md](architecture.md), [project-workflow.md](project-workflow.md).

## 1. Design principles

- **One look everywhere.** Every page uses the same sidebar, top bar, cards, tables and badges.
- **Same navigation on every screen.** A dark teal left menu with Dashboard, Inventory, Orders, Production and Reports, in this order. The current page is highlighted. The top bar shows the page title, a search box, the user name and role, and Logout.
- **Simple and buildable.** If a developer cannot build a screen in about two days, simplify it.
- **Real-life states.** Every list and form has loading, empty, error and success states.
- **Indian number format.** Money is written as `₹1,90,640`. Numbers in tables are right-aligned.

## 2. Style guide

![Style guide](images/01-style-guide.png)

### Colours

| Use | Colour | Tailwind |
| --- | --- | --- |
| Main | `#0d9488` | `teal-600` |
| Main dark (hover, headings) | `#0f766e` | `teal-700` |
| Sidebar | gradient from `#0f766e` to `#042f2e` | `from-teal-700 to-teal-950` |
| Accent | `#22c55e` | `green-500` |
| Danger | `#dc2626` | `red-600` |
| Warning | `#f59e0b` | `amber-500` |
| Page background | `#f8fafc` | `slate-50` |
| Text | `#0f172a` | `slate-900` |
| Muted text | `#64748b` | `slate-500` |
| Borders | `#e2e8f0` | `slate-200` |

### Typography

Font: **Inter** (Google Fonts).

| Use | Size | Weight | Tailwind |
| --- | --- | --- | --- |
| Page title | 26px | Bold | `text-2xl font-bold` |
| Section title | 18px | Semibold | `text-lg font-semibold` |
| Body text | 14px | Regular | `text-sm` |
| Table text | 13px | Regular | `text-[13px]` |
| Table header | 11.5px, uppercase | Semibold | `text-xs uppercase` |

### Components

| Part | Rule |
| --- | --- |
| Card | white, `border-slate-200`, `rounded-2xl`, `p-5`, `shadow-sm` |
| Main button | `bg-teal-600 text-white rounded-xl` |
| Secondary button | white, `border-slate-300`, `rounded-xl` |
| Danger button | `bg-red-600 text-white rounded-xl` |
| Input | `h-10 rounded-xl border-slate-300`, red border and red message when invalid |
| Table | header row on `bg-slate-50`, soft row dividers, actions on the right |
| Pop-up (modal) | white, `rounded-2xl`, dimmed background, Cancel and Confirm buttons at the bottom right |
| KPI card | round coloured icon, label, big number, small note under it |

### Status badges

One `StatusBadge` component is used for the whole app. Always use these exact words.

| Group | Word | Colour | Tailwind classes |
| --- | --- | --- | --- |
| Invoice | Pending | Blue | `bg-blue-100 text-blue-800` |
| Invoice | Created | Green | `bg-green-100 text-green-800` |
| Goods | Not Dispatched | Red | `bg-red-100 text-red-800` |
| Goods | Partially Dispatched | Orange | `bg-orange-100 text-orange-800` |
| Goods | Dispatched | Green | `bg-green-100 text-green-800` |
| Production | PLANNED | Blue | `bg-blue-100 text-blue-800` |
| Production | PENDING | Red | `bg-red-100 text-red-800` |
| Production | WIP | Yellow | `bg-yellow-100 text-yellow-800` |
| Production | IN-TESTING | Grey | `bg-gray-200 text-gray-800` |
| Production | COMPLETED | Green | `bg-green-100 text-green-800` |

## 3. Screens

### 3.1 Login

Everyone. There is no sign-up page; accounts are created by the Admin. After login, Admin and Manager go to the Dashboard and Worker goes to Inventory.

![Login](images/02-login.png)

### 3.2 Dashboard

Admin and Manager. Six KPI cards, orders per month (sales and purchase), stock value by item, production status, the low-stock list and the late-orders list.

![Dashboard](images/03-dashboard.png)

### 3.3 Inventory

Admin and Manager see every action. Search, filter by Raw or Finished, and download as CSV. The row actions are Change Stock, History and Edit.

![Inventory](images/04-inventory.png)

**Worker view.** The Worker sees only Inventory and Production in the menu. Add Item and Edit Item are hidden. Change Stock and History stay.

![Inventory, Worker view](images/05-inventory-worker-view.png)

### 3.4 Inventory pop-ups

Add or Edit Item (with form checks), Change Stock (with a reason and a preview of the new quantity) and Stock History.

![Inventory pop-ups](images/06-inventory-popups.png)

### 3.5 Orders

Admin and Manager. Sales and purchase orders in one list. The Create Order form opens from the right.

![Orders](images/07-orders.png)

### 3.6 Order details

Order lines with ordered, dispatched and remaining quantities, an invoice step, partial dispatch, and a dated timeline. Dispatching asks for confirmation first.

![Order details](images/08-order-details.png)

### 3.7 Production

Everyone can see it. Admin and Manager can create orders. Workers can update the status. The Create form shows the raw materials needed and whether there is enough in stock.

![Production](images/09-production.png)

### 3.8 Production details

The five stages, progress, the raw materials and their cost, and what will be added to stock when the order is completed.

![Production details](images/10-production-details.png)

### 3.9 Reports

Admin and Manager. Four reports with date and type filters and a CSV download on each: stock valuation, orders summary, production summary, and low stock and late orders.

![Reports](images/11-reports.png)

### 3.10 UI states

Use the same look everywhere: loading, empty, error, success message, form check, saving state and confirm dialog.

![UI states](images/12-ui-states.png)

| State | What it looks like |
| --- | --- |
| Loading | Grey placeholder rows and the text "Loading items..." |
| Empty | A friendly message and a next step: "No items yet. Click Add item." |
| Error | A red banner: "Could not load orders. Please try again." with a Retry button |
| Success | A short green message in a corner: "Stock updated" |
| Form check | Red border and a message under the wrong field |
| Saving | The Save button is disabled and says "Saving..." |
| Confirm | A dialog for important actions with Cancel and Confirm buttons |

Confirmation dialogs are used for changing stock, creating an invoice, dispatching or receiving goods, and completing production.

## 4. Phone layouts

On a phone the left menu becomes a menu button, cards stack one under another, and wide tables become cards or scroll sideways. Phone width is 390 px.

| Login | Dashboard | Inventory | Orders |
| --- | --- | --- | --- |
| ![Phone login](images/16-phone-login.png) | ![Phone dashboard](images/13-phone-dashboard.png) | ![Phone inventory](images/14-phone-inventory.png) | ![Phone orders](images/15-phone-orders.png) |

## 5. What each role sees

| Role | Menu | Hidden or disabled |
| --- | --- | --- |
| Admin | Dashboard, Inventory, Orders, Production, Reports | Nothing |
| Manager | Dashboard, Inventory, Orders, Production, Reports | Nothing important |
| Worker | Inventory, Production (lands on Inventory after login) | Add Item, Edit Item, Create Order, Create Production Order. Worker keeps Change Stock and Update Production Status |

Hiding a button is only for neatness. The backend does the real blocking and answers `403 Forbidden` when a role is not allowed.

## 6. Hand-over notes for developers

- Build the pictures in this file with Tailwind classes from the style guide.
- Reuse one `Layout`, one `Modal` and one `StatusBadge` for every page.
- Use `lucide-react` for icons and Recharts for charts.
- Format money with `toLocaleString("en-IN")`.
