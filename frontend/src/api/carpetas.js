import { api } from "./client";

// Backend esperado (tabla `carpetas`):
//   GET  /api/carpetas          -> catálogo { id, numero_carpeta } para el <select> del registro
//   POST /api/carpetas          { numero_carpeta } -> crea una carpeta nueva
//   DELETE /api/carpetas/:id    -> baja lógica (activo = false)

export const carpetasApi = {
  listar: () => api.get("/carpetas"),
  crear: (numero_carpeta) => api.post("/carpetas", { numero_carpeta }),
  eliminar: (id) => api.del(`/carpetas/${id}`),
};
