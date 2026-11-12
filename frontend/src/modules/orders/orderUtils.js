export const errorMessage = (err) => {
  const status = err.response?.status ?? err.status;
  if (status === 403) return "You do not have permission to do this.";
  const msg = err.response?.data?.error || err.data?.error || err.message;
  if (!status && (!msg || /failed to fetch|network/i.test(msg))) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
};