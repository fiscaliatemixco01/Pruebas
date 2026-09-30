import { api } from "./client";

export const notificacionesApi = {
  listar: () => api.get("/notificaciones"),
  marcarLeida: (id) => api.put(`/notificaciones/${id}/leida`, {}),
  marcarTodas: () => api.put("/notificaciones/leer-todas", {}),
};