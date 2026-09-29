import { api } from "./client";

// Backend esperado (tabla `peticiones` en Postgres, esquema normalizado):
//   POST /api/peticiones                    -> crea el registro (paso 1) y regresa la fila insertada
//                                               (numero_llamado, fecha_recibido y hora_recibido los pone la BD,
//                                               salvo llamados manuales FMG/FMAP donde numero_llamado se manda a mano)
//   PUT  /api/peticiones/:id                -> actualiza cualquier campo editable (paso 2 o edición general)
//   GET  /api/peticiones/:id                -> obtiene una petición por id (vw_peticiones, ya con nombres resueltos)
//   GET  /api/peticiones?numero_llamado=&perito=&fecha=   -> búsqueda con filtros
//   GET  /api/peritos                       -> catálogo de peritos { id, nombre } para el <select>
//   GET  /api/materias                      -> catálogo de materias { id, nombre } para el <select>
//   GET  /api/llamados                      -> catálogo de tipos de llamado { id, codigo, es_automatico }

export const peticionesApi = {
  crear: (payload) => api.post("/peticiones", payload),
  completar: (id, payload) => api.put(`/peticiones/${id}`, payload),
  obtener: (id) => api.get(`/peticiones/${id}`),
  buscar: (filtros) => api.get("/peticiones", filtros),
  listarPeritos: () => api.get("/peritos"),
  listarMaterias: () => api.get("/materias"),
  listarLlamados: () => api.get("/llamados"),
  listarAsignadas: () => api.get("/peticiones/asignadas"),
};
