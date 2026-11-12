const COLORS = {
  Pending: "bg-blue-100 text-blue-800",
  Created: "bg-green-100 text-green-800",
  "Not Dispatched": "bg-red-100 text-red-800",
  "Partially Dispatched": "bg-orange-100 text-orange-800",
  Dispatched: "bg-green-100 text-green-800",
  PLANNED: "bg-blue-100 text-blue-800",
  PENDING: "bg-red-100 text-red-800",
  WIP: "bg-yellow-100 text-yellow-800",
  "IN-TESTING": "bg-gray-200 text-gray-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }) {
  const cls = COLORS[status] || "bg-gray-100 text-gray-700"; 
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}
