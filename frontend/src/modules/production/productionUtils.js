// Status order from the cheat-sheet. Forward only, one step at a time.
export const STAGES = ["PLANNED", "PENDING", "WIP", "IN-TESTING", "COMPLETED"];

export const fmtMoney = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// Guide rules: no reply = network error, 403 = no permission, 400/409 = show the server message
export const errorMessage = (err) => {
  const res = err.response;
  if (!res) return "Cannot reach the server. Check your connection and try again.";
  if (res.status === 403) return "You do not have permission to do this.";
  return res.data?.error || "Something went wrong. Please try again.";
};
