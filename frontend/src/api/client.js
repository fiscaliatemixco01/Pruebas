// ---------------------------------------------------------------------------
// Cliente API central.
//
// Este proyecto NO habla directo con Postgres desde el navegador (eso nunca
// es seguro). En su lugar, todas las funciones de aquí llaman a un backend
// (Node/Express, Fastify, Django, lo que ya tengas) que es el que ejecuta las
// queries contra tu base de datos Postgres.
//
// Configura la URL de tu API en un archivo `.env` en la raíz del proyecto:
//   VITE_API_URL=http://localhost:3000/api
//
// Y expón en tu backend endpoints REST equivalentes a los que se listan en
// cada archivo de src/api/*.js (peticiones.js, usuarios.js, bitacora.js,
// auth.js). Todos regresan/reciben JSON.
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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
    headers: { "Content-Type": "application/json" },
    credentials: "include", // manda la cookie de sesión si tu backend usa sesiones
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = data?.message || `Error ${res.status} al llamar ${path}`;
    throw new Error(message);
  }

  return data;
}

// Para subir archivos (multipart/form-data). No mandamos el header
// Content-Type a mano: el navegador arma el boundary correcto solo si se lo
// dejamos poner a él.
async function requestForm(path, { method = "POST", formData } = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    credentials: "include",
    body: formData,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = data?.message || `Error ${res.status} al llamar ${path}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path, params) => request(path, { method: "GET", params }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) => requestForm(path, { method: "POST", formData }),
};
