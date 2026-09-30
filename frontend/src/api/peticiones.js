import { api } from "./client";
 
export const peticionesApi = {
  crear: (payload) => api.post("/peticiones", payload),
  completar: (id, payload) => api.put(`/peticiones/${id}`, payload),
  obtener: (id) => api.get(`/peticiones/${id}`),
  buscar: (filtros) => api.get("/peticiones", filtros),
  listarPeritos: () => api.get("/peritos"),
  listarMaterias: (llamadoId) => api.get("/materias", llamadoId ? { llamado_id: llamadoId } : undefined),
  listarLlamados: () => api.get("/llamados"),
  listarAsignadas: () => api.get("/peticiones/asignadas"),
  porFirmar: () => api.get("/peticiones/por-firmar"),
  pendientes: () => api.get("/peticiones/pendientes"),

  // Entrega (PDF) de una petición
  obtenerEntrega: (id) => api.get(`/peticiones/${id}/entrega`),
  subirEntrega: (id, { tipo, archivo }) => {
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("tipo", tipo);
    return api.postForm(`/peticiones/${id}/entrega`, fd);
  }, 
   descargarEntrega: (id) => api.getBlob(`/peticiones/${id}/entrega/archivo`),

  // Firma de recepción (Administrador / Receptor), con su contraseña
  firmar: (id, contrasena) => api.post(`/peticiones/${id}/firmar`, { contrasena }),
};
