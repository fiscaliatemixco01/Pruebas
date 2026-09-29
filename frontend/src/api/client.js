// ---------------------------------------------------------------------------
// Cliente API central. Todas las funciones de src/api/*.js llaman a tu backend
// Express, que es el que ejecuta las queries contra Postgres.
//
// URL de la API en `.env`:  VITE_API_URL=http://localhost:3000/api
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const TOKEN_KEY = "token"; // debe coincidir con src/api/auth.js

// Token JWT guardado al iniciar sesión, enviado como Bearer en cada petición.
function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// El backend responde { error: "..." }; se acepta también { message: "..." }.
function mensajeDeError(res, data, path) {
  // Token vencido o inválido: se borra (el login mismo también responde 401 y no cuenta)
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    localStorage.removeItem(TOKEN_KEY);
  }
  return data?.error || data?.message || `Error ${res.status} al llamar ${path}`;
}

async function request(path, { method = "GET", body, params } = {}) {
  let url = `${BASE_URL}${path}`;

  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    if (query) url += `?${query}`;
  }

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new Error(mensajeDeError(res, data, path));
  }

  return data;
}

// Para subir archivos (multipart/form-data). No se pone Content-Type a mano:
// el navegador arma el boundary correcto solo.
async function requestForm(path, { method = "POST", formData } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    credentials: "include",
    body: formData,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new Error(mensajeDeError(res, data, path));
  }

  return data;
}

// Para descargar archivos (PDF) con el token; un <a href> no manda el header.
async function requestBlob(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(mensajeDeError(res, data, path));
  }

  return res.blob();
}

export const api = {
  get: (path, params) => request(path, { method: "GET", params }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) => requestForm(path, { method: "POST", formData }),
  getBlob: (path) => requestBlob(path),
};