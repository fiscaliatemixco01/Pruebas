import { api } from "./client";

// Backend esperado (tabla `bitacora`, alimentada por triggers o por el
// backend cada vez que se crea/edita una petición):
//   GET /api/bitacora?numero_llamado=&fecha=   -> lista de movimientos

export const bitacoraApi = {
  listar: (filtros) => api.get("/bitacora", filtros),
};
