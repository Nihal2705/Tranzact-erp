import { useEffect, useState } from "react";
import api from "../services/api";

function Inventory() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/items");

        setItems(response.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load inventory items.");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const filteredItems = items.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Inventory
          </h1>

          <p className="mt-2 text-gray-600">
            Manage your inventory items and stock.
          </p>
        </div>

        {/* Inventory Card */}
        <div className="rounded-lg bg-white p-6 shadow">

          {/* Search + Add Button */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Inventory Items
            </h2>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-md border border-gray-300 px-4 py-2 outline-none focus:border-blue-500"
              />

              <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Add Item
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <p className="py-6 text-center text-gray-600">
              Loading inventory items...
            </p>
          )}

          {/* Error */}
          {!loading && error && (
            <p className="py-6 text-center text-red-600">
              {error}
            </p>
          )}

          {/* Empty */}
          {!loading && !error && filteredItems.length === 0 && (
            <p className="py-6 text-center text-gray-500">
              No inventory items found.
            </p>
          )}

          {/* Table */}
          {!loading && !error && filteredItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left">Item Name</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Quantity</th>
                    <th className="p-3 text-left">Unit Price</th>
                    <th className="p-3 text-left">Total Value</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-3">
                        {item.name}
                      </td>

                      <td className="p-3">
                        {item.category}
                      </td>

                      <td className="p-3">
                        {item.quantity}
                      </td>

                      <td className="p-3">
                        ₹{item.unitPrice}
                      </td>

                      <td className="p-3">
                        ₹{item.quantity * item.unitPrice}
                      </td>

                      <td className="p-3">
                        <button className="mr-3 text-blue-600 hover:underline">
                          Edit
                        </button>

                        <button className="text-green-600 hover:underline">
                          Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Inventory;