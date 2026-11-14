import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

client.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export async function api(path, { method = "GET", body, params } = {}) {
  try {
    const res = await client.request({ url: path, method, data: body, params });
    return res.data;
  } catch (err) {
    if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw err;   // Axios errors already have err.response.status and err.response.data
  }
}

export default api;