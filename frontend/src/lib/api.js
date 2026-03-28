import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export async function registerUser(payload) {
  try {
    const { data } = await apiClient.post("/api/auth/register", payload);
    return data;
  } catch (error) {
    throw new Error(errorMessage(error, "Registration failed"));
  }
}

export async function loginUser(payload) {
  try {
    const { data } = await apiClient.post("/api/auth/login", payload);
    return data;
  } catch (error) {
    throw new Error(errorMessage(error, "Login failed"));
  }
}

export async function createChat(payload) {
  try {
    const { data } = await apiClient.post("/api/chat", payload);
    return data;
  } catch (error) {
    throw new Error(errorMessage(error, "Could not create chat"));
  }
}

export { API_BASE_URL };
