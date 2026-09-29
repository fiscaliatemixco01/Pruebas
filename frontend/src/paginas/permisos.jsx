// src/permisos.jsx  (muévelo fuera de /paginas: no es una página)

export const ROLES = {
  ADMIN: "Administrador",
  PERITO: "Perito",
  RECEPTOR: "Receptor",
  CONSULTA: "Consulta",
};

const { ADMIN, PERITO, RECEPTOR, CONSULTA } = ROLES;

/*
  Roles permitidos por vista. Se usa en App.jsx: <ProtectedRoute roles={VISTAS.estadisticas}>

  inicio          -> Home
  notificaciones  -> Notificaciones, PeticionPerito
  nuevoRegistro   -> NuevaPeticion
  expedientes     -> BuscarPeticion, EditarPeticion
  carpetas        -> Carpetas
  estadisticas    -> Estadisticas
  usuarios        -> Usuarios, CrearCuenta
  bitacora        -> Bitacora

  El Administrador está en todas.
*/
export const VISTAS = {
  inicio:         [ADMIN, PERITO, RECEPTOR, CONSULTA],
  notificaciones: [ADMIN, PERITO],
  nuevoRegistro:  [ADMIN, RECEPTOR],
  expedientes:    [ADMIN, RECEPTOR],
  carpetas:       [ADMIN, RECEPTOR],
  estadisticas:   [ADMIN, CONSULTA],
  usuarios:       [ADMIN],
  bitacora:       [ADMIN],
};

export function puedeVer(rol, vista) {
  return !!rol && !!VISTAS[vista]?.includes(rol);
}

// Ítems del menú lateral / navbar. Ajusta textos si hace falta.
const MENU = [
  { vista: "inicio",         ruta: "/",                   texto: "Inicio" },
  { vista: "notificaciones", ruta: "/notificaciones",     texto: "Notificaciones" },
  { vista: "nuevoRegistro",  ruta: "/peticiones/nueva",   texto: "Nuevo registro" },
  { vista: "expedientes",    ruta: "/peticiones/buscar",  texto: "Expedientes" },
  { vista: "carpetas",       ruta: "/carpetas",           texto: "Carpetas" },
  { vista: "estadisticas",   ruta: "/estadisticas",       texto: "Estadísticas" },
  { vista: "usuarios",       ruta: "/usuarios",           texto: "Usuarios" },
  { vista: "bitacora",       ruta: "/bitacora",           texto: "Bitácora" },
];

export function menuPara(rol) {
  return MENU.filter((item) => puedeVer(rol, item.vista));
}