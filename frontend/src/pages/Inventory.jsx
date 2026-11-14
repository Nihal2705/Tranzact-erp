import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Drawer from "../components/Drawer";

function Inventory() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canCreate = user.role !== "Worker";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [saving, setSaving] = useState(false);

  // CHANGE STOCK STATES
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockItem, setStockItem] = useState(null);
  const [stockChange, setStockChange] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSaving, setStockSaving] = useState(false);

  // HISTORY STATES
  const [showHistory, setShowHistory] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // FORM DATA
  const [formData, setFormData] = useState({
    name: "",
    item_type: "RAW",
    unit: "",
    quantity: "",
    price: "",
    low_stock_limit: "",
  });

  const itemsPerPage = 10;

  // -----------------------------
  // FETCH ITEMS
  // -----------------------------
  const fetchItems = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/items");

      setItems(response.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load inventory items."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // -----------------------------
  // ITEM VALUE
  // -----------------------------
  const getItemValue = (item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);

    return quantity * price;
  };

  // -----------------------------
  // TOTAL INVENTORY VALUE
  // -----------------------------
  const totalInventoryValue = useMemo(() => {
    return items.reduce((total, item) => {
      return total + getItemValue(item);
    }, 0);
  }, [items]);

  // -----------------------------
  // SEARCH
  // -----------------------------
  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [items, search]);

  // -----------------------------
  // SORT
  // -----------------------------
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];

    sorted.sort((a, b) => {
      let valueA;
      let valueB;

      if (sortField === "name") {
        valueA = String(a.name || "").toLowerCase();
        valueB = String(b.name || "").toLowerCase();
      } else if (sortField === "item_type") {
        valueA = String(a.item_type || "").toLowerCase();
        valueB = String(b.item_type || "").toLowerCase();
      } else if (sortField === "quantity") {
        valueA = Number(a.quantity || 0);
        valueB = Number(b.quantity || 0);
      } else if (sortField === "price") {
        valueA = Number(a.price || 0);
        valueB = Number(b.price || 0);
      }

      if (valueA < valueB) {
        return sortOrder === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return sortOrder === "asc" ? 1 : -1;
      }

      return 0;
    });

    return sorted;
  }, [filteredItems, sortField, sortOrder]);

  // -----------------------------
  // PAGINATION
  // -----------------------------
  const totalPages = Math.ceil(
    sortedItems.length / itemsPerPage
  );

  const paginatedItems = useMemo(() => {
    const startIndex =
      (currentPage - 1) * itemsPerPage;

    return sortedItems.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [sortedItems, currentPage]);

  // -----------------------------
  // CHANGE SORT
  // -----------------------------
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // -----------------------------
  // FORM CHANGE
  // -----------------------------
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // -----------------------------
  // RESET FORM
  // -----------------------------
  const resetForm = () => {
    setFormData({
      name: "",
      item_type: "RAW",
      unit: "",
      quantity: "",
      price: "",
      low_stock_limit: "",
    });

    setEditingItemId(null);
  };

  // -----------------------------
  // OPEN ADD FORM
  // -----------------------------
  const handleOpenAddForm = () => {
    setError("");
    resetForm();
    setShowAddForm(true);
  };

  // -----------------------------
  // CLOSE ADD FORM
  // -----------------------------
  const handleCloseAddForm = () => {
    if (saving) return;

    setShowAddForm(false);
    resetForm();
  };

  // -----------------------------
  // OPEN EDIT FORM
  // -----------------------------
  const handleOpenEditForm = (item) => {
    setError("");
    setEditingItemId(item.id);

    setFormData({
      name: item.name || "",
      item_type: item.item_type || "RAW",
      unit: item.unit || "pcs",

      // Quantity is intentionally empty.
      // Quantity must NOT be changed through Edit.
      quantity: "",

      price: item.price ?? "",
      low_stock_limit:
        item.low_stock_limit ?? "",
    });

    setShowEditForm(true);
  };

  // -----------------------------
  // CLOSE EDIT FORM
  // -----------------------------
  const handleCloseEditForm = () => {
    if (saving) return;

    setShowEditForm(false);
    resetForm();
  };

  // -----------------------------
  // ADD ITEM
  // -----------------------------
  const handleAddItem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const openingQuantity = formData.quantity === "" ? 0 : Number(formData.quantity);
    const price = Number(formData.price);
    const lowStockLimit = formData.low_stock_limit === "" ? 0 : Number(formData.low_stock_limit);

    // Basic validation
    if (!formData.name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (!formData.unit.trim()) {
      setError("Unit is required.");
      return;
    }

    if (Number.isNaN(openingQuantity) || openingQuantity < 0) {
      setError("Opening quantity must be 0 or greater.");
      return;
    }

    if (formData.price === "" || Number.isNaN(price) || price < 0) {
      setError("Unit price must be 0 or greater.");
      return;
    }

    if (Number.isNaN(lowStockLimit) || lowStockLimit < 0) {
      setError("Low stock limit must be 0 or greater.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: formData.name.trim(),
        item_type: formData.item_type,
        unit: formData.unit.trim(),
        opening_qty: openingQuantity,
        price: price,
        low_stock_limit: lowStockLimit,
      };

      await api.post("/items", payload);

      setShowAddForm(false);
      resetForm();
      setToast("Item added successfully");
      setTimeout(() => setToast(""), 3000);

      await fetchItems();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to add inventory item."
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // EDIT ITEM
  // -----------------------------
  const handleEditItem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (!formData.unit.trim()) {
      setError("Unit of measure is required.");
      return;
    }

    const price = Number(formData.price);
    if (formData.price === "" || Number.isNaN(price) || price < 0) {
      setError("Unit price must be 0 or greater.");
      return;
    }

    const lowStockLimit = formData.low_stock_limit === "" ? 0 : Number(formData.low_stock_limit);
    if (Number.isNaN(lowStockLimit) || lowStockLimit < 0) {
      setError("Low stock limit must be 0 or greater.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // IMPORTANT:
      // Quantity is intentionally NOT included.
      // Quantity can only be changed through Change Stock.
      const payload = {
        name: formData.name.trim(),
        item_type: formData.item_type,
        unit: formData.unit.trim(),
        price: price,
        low_stock_limit: lowStockLimit,
      };

      await api.put(
        `/items/${editingItemId}`,
        payload
      );

      setShowEditForm(false);
      resetForm();
      setToast("Item updated successfully");
      setTimeout(() => setToast(""), 3000);

      await fetchItems();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to update inventory item."
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // LOW STOCK CHECK
  // -----------------------------
  const isLowStock = (item) => {
    const quantity = Number(
      item.quantity || 0
    );

    const limit = Number(
      item.low_stock_limit || 0
    );

    return quantity <= limit;
  };

  // -----------------------------
  // OPEN CHANGE STOCK
  // -----------------------------
  const handleChangeStock = (item) => {
    setError("");
    setStockItem(item);
    setStockChange("");
    setStockReason("");
    setShowStockForm(true);
  };

  // -----------------------------
  // CLOSE CHANGE STOCK
  // -----------------------------
  const handleCloseStockForm = () => {
    if (stockSaving) return;

    setShowStockForm(false);
    setStockItem(null);
    setStockChange("");
    setStockReason("");
  };

  // -----------------------------
  // SUBMIT CHANGE STOCK
  // -----------------------------
  const handleSubmitStockChange = async (e) => {
    e.preventDefault();

    if (!stockItem) return;

    const change = Number(
      stockChange
    );

    if (
      stockChange === "" ||
      Number.isNaN(change) ||
      change === 0
    ) {
      setError(
        "Enter a valid stock change amount."
      );
      return;
    }

    if (!stockReason.trim()) {
      setError("Reason is required.");
      return;
    }

    const currentStock = Number(
      stockItem.quantity || 0
    );

    const newStock =
      currentStock + change;

    if (newStock < 0) {
      setError(
        `Stock cannot go below zero. Current stock is ${currentStock} ${stockItem.unit}.`
      );
      return;
    }

    const confirmed =
      window.confirm(
        `${change > 0 ? "Add" : "Reduce"} ${
          stockItem.name
        } by ${Math.abs(change)} ${
          stockItem.unit
        }?\n\nNew stock will be ${newStock} ${
          stockItem.unit
        }.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setStockSaving(true);
      setError("");

      const requestId =
        crypto.randomUUID();

      await api.put(
        `/api/items/${stockItem.id}/stock`,
        {
          change_qty: change,
          reason: stockReason.trim(),
          request_id: requestId,
        }
      );

      await fetchItems();

      setShowStockForm(false);
      setStockItem(null);
      setStockChange("");
      setStockReason("");

      setToast("Stock updated successfully");
      setTimeout(() => setToast(""), 3000);

      setError("");
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to update stock."
      );
    } finally {
      setStockSaving(false);
    }
  };

  // -----------------------------
  // OPEN HISTORY
  // -----------------------------
  const handleOpenHistory = async (item) => {
    setHistoryItem(item);
    setHistory([]);
    setHistoryError("");
    setShowHistory(true);
    setHistoryLoading(true);

    try {
      const response =
        await api.get(
          `/api/items/${item.id}/history`
        );

      setHistory(
        response.data || []
      );
    } catch (err) {
      console.error(err);

      setHistoryError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load stock history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // -----------------------------
  // CLOSE HISTORY
  // -----------------------------
  const handleCloseHistory = () => {
    if (historyLoading) return;

    setShowHistory(false);
    setHistoryItem(null);
    setHistory([]);
    setHistoryError("");
  };

  // -----------------------------
  // FORMAT DATE
  // -----------------------------
  const formatDateTime = (
    value
  ) => {
    if (!value) return "-";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage inventory items and stock.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            + Add item
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Items
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {items.length}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Inventory Value
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            ₹
            {totalInventoryValue.toFixed(
              2
            )}
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by item name..."
          value={search}
          onChange={(e) => {
            setSearch(
              e.target.value
            );
            setCurrentPage(1);
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/30 md:max-w-md"
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          Loading inventory...
        </div>
      ) : sortedItems.length ===
        0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          No inventory items found.
        </div>
      ) : (
        <>
          {/* TABLE */}
          <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                    onClick={() =>
                      handleSort(
                        "name"
                      )
                    }
                  >
                    Item Name
                    {sortField ===
                      "name" &&
                      (sortOrder ===
                      "asc"
                        ? " ↑"
                        : " ↓")}
                  </th>

                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                    onClick={() =>
                      handleSort(
                        "item_type"
                      )
                    }
                  >
                    Type
                    {sortField ===
                      "item_type" &&
                      (sortOrder ===
                      "asc"
                        ? " ↑"
                        : " ↓")}
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Unit
                  </th>

                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                    onClick={() =>
                      handleSort(
                        "quantity"
                      )
                    }
                  >
                    Quantity
                    {sortField ===
                      "quantity" &&
                      (sortOrder ===
                      "asc"
                        ? " ↑"
                        : " ↓")}
                  </th>

                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                    onClick={() =>
                      handleSort(
                        "price"
                      )
                    }
                  >
                    Unit Price
                    {sortField ===
                      "price" &&
                      (sortOrder ===
                      "asc"
                        ? " ↑"
                        : " ↓")}
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Total Value
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Stock Status
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedItems.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {
                          item.name
                        }
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {
                          item.item_type
                        }
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {
                          item.unit
                        }
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {
                          item.quantity
                        }
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        ₹
                        {Number(
                          item.price ||
                            0
                        ).toFixed(
                          2
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        ₹
                        {getItemValue(
                          item
                        ).toFixed(
                          2
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {isLowStock(
                          item
                        ) ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenEditForm(
                                  item
                                )
                              }
                              className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                            >
                              Edit
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleChangeStock(
                                item
                              )
                            }
                            className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                          >
                            Stock
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenHistory(
                                item
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages || 1}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage((prev) => Math.max(prev - 1, 1))
                }
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD ITEM DRAWER */}
      <Drawer
        open={showAddForm}
        title="Add new item"
        subtitle="Add a raw material or finished product to inventory."
        onClose={handleCloseAddForm}
        onConfirm={handleAddItem}
        confirmText="Add item"
        busy={saving}
      >
        <form onSubmit={handleAddItem} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Item name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              placeholder="e.g. Copper Pipe"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Item type *
            </label>
            <select
              name="item_type"
              value={formData.item_type}
              onChange={handleFormChange}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="RAW">RAW (Raw Material)</option>
              <option value="FINISHED">FINISHED (Finished Good)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit of measure *
              </label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleFormChange}
                required
                placeholder="e.g. pcs, kg, mtr"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit price (₹) *
              </label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleFormChange}
                required
                placeholder="0.00"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Opening quantity
              </label>
              <input
                type="number"
                name="quantity"
                min="0"
                step="1"
                value={formData.quantity}
                onChange={handleFormChange}
                placeholder="0"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              <p className="mt-1 text-xs text-slate-400">
                Saved as opening stock.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Low stock limit
              </label>
              <input
                type="number"
                name="low_stock_limit"
                min="0"
                step="1"
                value={formData.low_stock_limit}
                onChange={handleFormChange}
                placeholder="0"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              <p className="mt-1 text-xs text-slate-400">
                Warning limit.
              </p>
            </div>
          </div>
        </form>
      </Drawer>

      {/* EDIT ITEM DRAWER */}
      <Drawer
        open={showEditForm}
        title="Edit item"
        subtitle="Update item details and stock warning limits."
        onClose={handleCloseEditForm}
        onConfirm={handleEditItem}
        confirmText="Save changes"
        busy={saving}
      >
        <form onSubmit={handleEditItem} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Item name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              placeholder="e.g. Copper Wire 2.5mm"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Item type *
            </label>
            <select
              name="item_type"
              value={formData.item_type}
              onChange={handleFormChange}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="RAW">RAW</option>
              <option value="FINISHED">FINISHED</option>
              <option value="PACKAGING">PACKAGING</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit of measure *
              </label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleFormChange}
                required
                placeholder="e.g. pcs, kg, mtr"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit price (₹) *
              </label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleFormChange}
                required
                placeholder="0.00"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Low stock limit
            </label>
            <input
              type="number"
              name="low_stock_limit"
              min="0"
              step="1"
              value={formData.low_stock_limit}
              onChange={handleFormChange}
              placeholder="0"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            <p className="mt-1 text-xs text-slate-400">
              Warning limit for low-stock alerts. Quantity can only be adjusted via Change Stock.
            </p>
          </div>
        </form>
      </Drawer>

      {/* CHANGE STOCK MODAL */}
      {showStockForm && stockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Change Stock
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {stockItem.name}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseStockForm}
                disabled={stockSaving}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Stock
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {stockItem.quantity} {stockItem.unit}
              </p>
            </div>

            <form onSubmit={handleSubmitStockChange} className="space-y-4">
              {/* STOCK CHANGE */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Stock Change
                </label>

                <input
                  type="number"
                  value={stockChange}
                  onChange={(e) => setStockChange(e.target.value)}
                  placeholder="Example: 50 or -10"
                  step="1"
                  required
                  disabled={stockSaving}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-slate-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Use a positive number to add stock and a negative number to reduce stock.
                </p>
              </div>

              {/* REASON */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Reason
                </label>

                <input
                  type="text"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder="Example: Stock count correction"
                  required
                  disabled={stockSaving}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:bg-slate-100"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseStockForm}
                  disabled={stockSaving}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={stockSaving}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {stockSaving ? "Saving..." : "Confirm Stock Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
            {/* HISTORY HEADER */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Stock History
                </h2>

                {historyItem && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {historyItem.name} — Current Stock: {historyItem.quantity} {historyItem.unit}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCloseHistory}
                disabled={historyLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg leading-none text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* HISTORY ERROR */}
            {historyError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {historyError}
              </div>
            )}

            {/* HISTORY LOADING */}
            {historyLoading ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Loading stock history...
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No stock history found.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Date / Time</th>
                      <th className="px-4 py-3 text-left">Changed Via</th>
                      <th className="px-4 py-3 text-left">Change Qty</th>
                      <th className="px-4 py-3 text-left">Balance After</th>
                      <th className="px-4 py-3 text-left">Reason</th>
                      <th className="px-4 py-3 text-left">Changed By</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {history.map((entry, index) => {
                      const changeQty = Number(entry.change_qty || 0);

                      return (
                        <tr key={entry.id || index} className="hover:bg-slate-50/50">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {formatDateTime(
                              entry.created_at ||
                                entry.changed_at ||
                                entry.createdAt
                            )}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {entry.changed_via || entry.changedVia || "-"}
                          </td>

                          <td
                            className={`whitespace-nowrap px-4 py-3 font-semibold ${
                              changeQty > 0
                                ? "text-emerald-600"
                                : changeQty < 0
                                ? "text-rose-600"
                                : "text-slate-600"
                            }`}
                          >
                            {changeQty > 0 ? `+${changeQty}` : changeQty}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {entry.balance_after ?? entry.balanceAfter ?? "-"}{" "}
                            {historyItem?.unit}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {entry.reason || "-"}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {entry.changed_by_name ||
                              entry.changedByName ||
                              entry.changed_by ||
                              "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CLOSE BUTTON */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleCloseHistory}
                disabled={historyLoading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;