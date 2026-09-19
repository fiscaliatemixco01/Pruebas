import { api } from "./client";

// Backend esperado:
//   POST /api/auth/login        { usuario, contrasena }            -> { id, nombre, apellidos, rol, materia }
//   POST /api/auth/logout       ()                                  -> {}
//   GET  /api/auth/me           ()                                  -> { id, nombre, apellidos, rol, materia } | 401
//   POST /api/auth/registro     { nombre, apellidos, rol, materia, biometrico } -> { id, ... }

export const authApi = {
  login: (usuario, contrasena) => api.post("/auth/login", { usuario, contrasena }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  registrar: (payload) => api.post("/auth/registro", payload),
};
