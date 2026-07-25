const configuredApiUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL =
  configuredApiUrl?.replace(/\/$/, "") ?? "http://127.0.0.1:8000/api/v1";

export const APPLICATION_NAME = "Samarakoon Agro POS";
