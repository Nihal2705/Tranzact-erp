import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    unit: "pcs",
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
      unit: "pcs",
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
    e.preventDefault();

    const openingQuantity = Number(
      formData.quantity
    );

    const price = Number(formData.price);

    const lowStockLimit = Number(
      formData.low_stock_limit
    );

    // Basic validation
    if (!formData.name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (!formData.unit.trim()) {
      setError("Unit is required.");
      return;
    }

    if (
      formData.quantity === "" ||
      Number.isNaN(openingQuantity) ||
      openingQuantity < 0
    ) {
      setError(
        "Opening quantity must be 0 or greater."
      );
      return;
    }

    if (
      formData.price === "" ||
      Number.isNaN(price) ||
      price < 0
    ) {
      setError(
        "Unit price must be 0 or greater."
      );
      return;
    }

    if (
      formData.low_stock_limit === "" ||
      Number.isNaN(lowStockLimit) ||
      lowStockLimit < 0
    ) {
      setError(
        "Low stock limit must be 0 or greater."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      // IMPORTANT:
      // Backend expects opening_qty, NOT quantity.
      const payload = {
        name: formData.name.trim(),
        item_type: formData.item_type,
        unit: formData.unit.trim(),
        opening_qty: openingQuantity,
        price: price,
        low_stock_limit: lowStockLimit,
      };

      console.log(
        "Add Item payload:",
        payload
      );

      await api.post(
        "/api/items",
        payload
      );

      setShowAddForm(false);
      resetForm();

      await fetchItems();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
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
    e.preventDefault();

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
        price: Number(formData.price),
        low_stock_limit:
          Number(formData.low_stock_limit),
      };

      await api.put(
        `/api/items/${editingItemId}`,
        payload
      );

      setShowEditForm(false);
      resetForm();

      await fetchItems();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
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
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage inventory items and stock.
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleOpenAddForm
          }
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Item
        </button>
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 md:max-w-md"
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
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenEditForm(
                                item
                              )
                            }
                            className="rounded-md bg-yellow-500 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-600"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleChangeStock(
                                item
                              )
                            }
                            className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
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
                            className="rounded-md bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
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
            <p className="text-sm text-gray-500">
              Page{" "}
              {
                currentPage
              }{" "}
              of{" "}
              {
                totalPages ||
                  1
              }
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  currentPage ===
                  1
                }
                onClick={() =>
                  setCurrentPage(
                    (prev) =>
                      Math.max(
                        prev -
                          1,
                        1
                      )
                  )
                }
                className="rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (prev) =>
                      Math.min(
                        prev +
                          1,
                        totalPages
                      )
                  )
                }
                className="rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADD ITEM MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Add Item
              </h2>

              <button
                type="button"
                onClick={
                  handleCloseAddForm
                }
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleAddItem
              }
            >
              <div className="space-y-4">
                {/* NAME */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                {/* TYPE */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Type
                  </label>

                  <select
                    name="item_type"
                    value={
                      formData.item_type
                    }
                    onChange={
                      handleFormChange
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="RAW">
                      RAW
                    </option>

                    <option value="FINISHED">
                      FINISHED
                    </option>

                    <option value="PACKAGING">
                      PACKAGING
                    </option>
                  </select>
                </div>

                {/* UNIT */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unit
                  </label>

                  <input
                    type="text"
                    name="unit"
                    value={
                      formData.unit
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                {/* OPENING QUANTITY */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Opening Quantity
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={
                      formData.quantity
                    }
                    onChange={
                      handleFormChange
                    }
                    min="0"
                    step="1"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    This quantity is saved as opening stock.
                  </p>
                </div>

                {/* PRICE */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unit Price
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={
                      formData.price
                    }
                    onChange={
                      handleFormChange
                    }
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                {/* LOW STOCK LIMIT */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Low Stock Limit
                  </label>

                  <input
                    type="number"
                    name="low_stock_limit"
                    value={
                      formData.low_stock_limit
                    }
                    onChange={
                      handleFormChange
                    }
                    min="0"
                    step="1"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={
                    handleCloseAddForm
                  }
                  disabled={
                    saving
                  }
                  className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {showEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Item
              </h2>

              <button
                type="button"
                onClick={
                  handleCloseEditForm
                }
                className="text-xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleEditItem
              }
            >
              <div className="space-y-4">
                {/* NAME */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                {/* TYPE */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Type
                  </label>

                  <select
                    name="item_type"
                    value={
                      formData.item_type
                    }
                    onChange={
                      handleFormChange
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="RAW">
                      RAW
                    </option>

                    <option value="FINISHED">
                      FINISHED
                    </option>

                    <option value="PACKAGING">
                      PACKAGING
                    </option>
                  </select>
                </div>

                {/* UNIT */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unit
                  </label>

                  <input
                    type="text"
                    name="unit"
                    value={
                      formData.unit
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                {/* PRICE */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unit Price
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={
                      formData.price
                    }
                    onChange={
                      handleFormChange
                    }
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                {/* LOW STOCK LIMIT */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Low Stock Limit
                  </label>

                  <input
                    type="number"
                    name="low_stock_limit"
                    value={
                      formData.low_stock_limit
                    }
                    onChange={
                      handleFormChange
                    }
                    min="0"
                    step="1"
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={
                    handleCloseEditForm
                  }
                  disabled={
                    saving
                  }
                  className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  {saving
                    ? "Updating..."
                    : "Update Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE STOCK MODAL */}
      {showStockForm &&
        stockItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Change Stock
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {
                      stockItem.name
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleCloseStockForm
                  }
                  disabled={
                    stockSaving
                  }
                  className="text-xl text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="mb-5 rounded-md bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  Current Stock
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {
                    stockItem.quantity
                  }{" "}
                  {
                    stockItem.unit
                  }
                </p>
              </div>

              <form
                onSubmit={
                  handleSubmitStockChange
                }
              >
                <div className="space-y-4">
                  {/* STOCK CHANGE */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Stock Change
                    </label>

                    <input
                      type="number"
                      value={
                        stockChange
                      }
                      onChange={(
                        e
                      ) =>
                        setStockChange(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="Example: 50 or -10"
                      step="1"
                      required
                      disabled={
                        stockSaving
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />

                    <p className="mt-1 text-xs text-gray-500">
                      Use a positive number to add stock and a negative number to reduce stock.
                    </p>
                  </div>

                  {/* REASON */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Reason
                    </label>

                    <input
                      type="text"
                      value={
                        stockReason
                      }
                      onChange={(
                        e
                      ) =>
                        setStockReason(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="Example: Stock count correction"
                      required
                      disabled={
                        stockSaving
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={
                      handleCloseStockForm
                    }
                    disabled={
                      stockSaving
                    }
                    className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      stockSaving
                    }
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {stockSaving
                      ? "Saving..."
                      : "Confirm Stock Change"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-xl">
            {/* HISTORY HEADER */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Stock History
                </h2>

                {historyItem && (
                  <p className="mt-1 text-sm text-gray-500">
                    {
                      historyItem.name
                    }{" "}
                    — Current Stock:{" "}
                    {
                      historyItem.quantity
                    }{" "}
                    {
                      historyItem.unit
                    }
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={
                  handleCloseHistory
                }
                disabled={
                  historyLoading
                }
                className="text-xl text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* HISTORY ERROR */}
            {historyError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {
                  historyError
                }
              </div>
            )}

            {/* HISTORY LOADING */}
            {historyLoading ? (
              <div className="rounded-md border bg-gray-50 p-8 text-center text-gray-500">
                Loading stock history...
              </div>
            ) : history.length ===
              0 ? (
              <div className="rounded-md border bg-gray-50 p-8 text-center text-gray-500">
                No stock history found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Date / Time
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Changed Via
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Change Qty
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Balance After
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Reason
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                        Changed By
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {history.map(
                      (
                        entry,
                        index
                      ) => {
                        const changeQty =
                          Number(
                            entry.change_qty ||
                              0
                          );

                        return (
                          <tr
                            key={
                              entry.id ||
                              index
                            }
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                              {formatDateTime(
                                entry.created_at ||
                                  entry.changed_at ||
                                  entry.createdAt
                              )}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600">
                              {
                                entry.changed_via ||
                                  entry.changedVia ||
                                  "-"
                              }
                            </td>

                            <td
                              className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${
                                changeQty >
                                0
                                  ? "text-green-600"
                                  : changeQty <
                                    0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {changeQty >
                              0
                                ? `+${changeQty}`
                                : changeQty}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600">
                              {entry.balance_after ??
                                entry.balanceAfter ??
                                "-"}{" "}
                              {
                                historyItem?.unit
                              }
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600">
                              {
                                entry.reason ||
                                  "-"
                              }
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600">
                              {
                                entry.changed_by_name ||
                                  entry.changedByName ||
                                  entry.changed_by ||
                                  "-"
                              }
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* CLOSE BUTTON */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={
                  handleCloseHistory
                }
                disabled={
                  historyLoading
                }
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
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