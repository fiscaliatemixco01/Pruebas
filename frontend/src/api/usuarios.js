import { api } from "./client";

export const usuariosApi = {
  // Lista todos los usuarios
  listar: () => api.get("/usuarios"),

  // Cambiar contraseña del usuario logueado
  cambiarContrasena: (datos) => api.put("/auth/admin/cambiar-contrasena", datos)
};