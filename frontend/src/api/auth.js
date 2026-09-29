// src/api/auth.js
import { api } from "./client";

export const TOKEN_KEY = "token";

// Backend:
//   POST /api/auth/login   { usuario, contrasena } -> { token, usuario: { id, nombre, apellidos, correo, rol, materia } }
//   GET  /api/auth/me      (Bearer token)          -> { id, nombre, apellidos, correo, rol, materia } | 401
//   POST /api/auth/registro, /enviar-codigo, /confirmar-codigo  (solo Administrador)

export const authApi = {
  login: async (usuario, contrasena) => {
    const data = await api.post("/auth/login", { usuario, contrasena });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.usuario;
  },

  // El JWT no se invalida en el servidor: basta con borrarlo aquí.
  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  me: () => {
    if (!localStorage.getItem(TOKEN_KEY)) return Promise.reject(new Error("Sin sesión"));
    return api.get("/auth/me");
  },

  registrar: (payload) => api.post("/auth/registro", payload),
  enviarCodigoVerificacion: (correo) => api.post("/auth/enviar-codigo", { correo }),
  confirmarCodigoVerificacion: (correo, codigo) =>
    api.post("/auth/confirmar-codigo", { correo, codigo }),
};