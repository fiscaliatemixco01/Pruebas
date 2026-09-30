import { api } from "./client";

export const peticionesApi = {
  crear: (payload) => api.post("/peticiones", payload),
  completar: (id, payload) => api.put(`/peticiones/${id}`, payload),
  obtener: (id) => api.get(`/peticiones/${id}`),
  buscar: (filtros) => api.get("/peticiones", filtros),
  listarPeritos: () => api.get("/peritos"),
  listarMaterias: () => api.get("/materias"),
  listarLlamados: () => api.get("/llamados"),
  listarAsignadas: () => api.get("/peticiones/asignadas"),

  // Entrega (PDF) de una petición
  obtenerEntrega: (id) => api.get(`/peticiones/${id}/entrega`),
  subirEntrega: (id, { tipo, archivo }) => {
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("tipo", tipo);
    return api.postForm(`/peticiones/${id}/entrega`, fd);
  },
  descargarEntrega: (id) => api.getBlob(`/peticiones/${id}/entrega/archivo`),
};
