import { api } from "./client";

// Backend esperado:
//   GET /api/estadisticas/conteos?materia_id=   -> { dia, semana, mes } (numero de peticiones)
//                                                    si no se manda materia_id, cuenta todas las materias
//   GET /api/estadisticas/por-materia            -> [{ materia_id, materia, total }] para la gráfica de pastel

export const estadisticasApi = {
  conteos: (materiaId) =>
    api.get("/estadisticas/conteos", materiaId && materiaId !== "todas" ? { materia_id: materiaId } : {}),
  porMateria: () => api.get("/estadisticas/por-materia"),
};
