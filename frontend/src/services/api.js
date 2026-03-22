import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
  withCredentials: true,
});

export const openApi = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        console.warn("Sessão expirada ou logout detectado");

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("companyId");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

api.interceptors.request.use((config) => {
  if (config.url.includes("undefined")) {
    return Promise.reject("Request bloqueada: ID undefined");
  }

  return config;
});

export default api;
