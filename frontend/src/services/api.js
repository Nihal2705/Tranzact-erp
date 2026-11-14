import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

client.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  if (cfg.url && cfg.url.startsWith("/api/")) {
    cfg.url = cfg.url.replace(/^\/api/, "");
  }
  return cfg;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export async function api(path, { method = "GET", body, params } = {}) {
  const url = path.startsWith("/api/") ? path.replace(/^\/api/, "") : path;
  const res = await client.request({ url, method, data: body, params });
  return res.data;
}

api.get = (url, config = {}) => {
  const clean = url.startsWith("/api/") ? url.replace(/^\/api/, "") : url;
  return client.get(clean, config);
};

api.post = (url, data, config = {}) => {
  const clean = url.startsWith("/api/") ? url.replace(/^\/api/, "") : url;
  return client.post(clean, data, config);
};

api.put = (url, data, config = {}) => {
  const clean = url.startsWith("/api/") ? url.replace(/^\/api/, "") : url;
  return client.put(clean, data, config);
};

api.delete = (url, config = {}) => {
  const clean = url.startsWith("/api/") ? url.replace(/^\/api/, "") : url;
  return client.delete(clean, config);
};

api.patch = (url, data, config = {}) => {
  const clean = url.startsWith("/api/") ? url.replace(/^\/api/, "") : url;
  return client.patch(clean, data, config);
};

export default api;
