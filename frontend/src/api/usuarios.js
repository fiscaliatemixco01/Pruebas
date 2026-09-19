import { api } from "./client";

// Backend esperado (tabla `usuarios`):
//   GET /api/usuarios   -> lista de { nombre, apellidos, rol, materia }

export const usuariosApi = {
  listar: () => api.get("/usuarios"),
};
