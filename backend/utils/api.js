import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const api = axios.create({
  baseURL: process.env.BASE_URL,
  withCredentials: true, // for cookies
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors - in backend context, this might be handled differently
    // This interceptor is more relevant for frontend usage
    return Promise.reject(error);
  }
);

export default api;
