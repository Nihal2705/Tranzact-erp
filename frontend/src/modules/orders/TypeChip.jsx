export default function TypeChip({ type }) {
  const sales = type === "SALES";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${sales ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
      {sales ? "Sales" : "Purchase"}
    </span>
  );
}
