import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./reutilizables/ProtectedRoute";

import Estadisticas from "./paginas/Estadisticas";
import Notificaciones from "./paginas/Notificaciones";
import PeticionPerito from "./paginas/PeticionPerito";
import Login from "./paginas/login";
import CrearCuenta from "./paginas/CrearCuenta";
import Home from "./paginas/Home";
import NuevaPeticion from "./paginas/NuevaPeticion";
import BuscarPeticion from "./paginas/BuscarPeticion";
import EditarPeticion from "./paginas/EditarPeticion";
import Bitacora from "./paginas/Bitacora";
import Usuarios from "./paginas/Usuarios";
import Carpetas from "./paginas/Carpetas";
import { VISTAS } from "./paginas/permisos";
import PorFirmar from "./paginas/PorFirmar";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Inicio: cualquier rol con sesión */}
        <Route
          path="/"
          element={<ProtectedRoute roles={VISTAS.inicio}><Home /></ProtectedRoute>}
        />

        {/* Nuevo registro: Administrador, Receptor */}
        <Route
          path="/peticiones/nueva"
          element={<ProtectedRoute roles={VISTAS.nuevoRegistro}><NuevaPeticion /></ProtectedRoute>}
        />

        {/* Expedientes: Administrador, Receptor */}
        <Route
          path="/peticiones/buscar"
          element={<ProtectedRoute roles={VISTAS.expedientes}><BuscarPeticion /></ProtectedRoute>}
        />

        {/* Buscar para editar: solo Administrador */}
        <Route
          path="/peticiones/editar"
          element={<ProtectedRoute roles={VISTAS.editarPeticion}><EditarPeticion /></ProtectedRoute>}
        />

        {/* Ficha de una petición: todos los roles (solo lectura salvo Administrador;
            el Perito además sube su PDF, y el backend limita a sus asignadas) */}
        <Route
          path="/peticiones/editar/:id"
          element={<ProtectedRoute roles={VISTAS.verPeticion}><EditarPeticion /></ProtectedRoute>}
        />

        {/* Carpetas: Administrador, Receptor */}
        <Route
          path="/carpetas"
          element={<ProtectedRoute roles={VISTAS.carpetas}><Carpetas /></ProtectedRoute>}
        />

        {/* Estadísticas: Administrador, Consulta */}
        <Route
          path="/estadisticas"
          element={<ProtectedRoute roles={VISTAS.estadisticas}><Estadisticas /></ProtectedRoute>}
        />

        {/* Notificaciones: Administrador, Perito */}
        <Route
          path="/notificaciones"
          element={<ProtectedRoute roles={VISTAS.notificaciones}><Notificaciones /></ProtectedRoute>}
        />
        <Route
          path="/peticiones/perito/:id"
          element={<ProtectedRoute roles={VISTAS.notificaciones}><PeticionPerito /></ProtectedRoute>}
        />

        {/* Solo Administrador */}
        <Route
          path="/usuarios"
          element={<ProtectedRoute roles={VISTAS.usuarios}><Usuarios /></ProtectedRoute>}
        />
        <Route
          path="/crear-cuenta"
          element={<ProtectedRoute roles={VISTAS.crearCuenta}><CrearCuenta /></ProtectedRoute>}
        />
        <Route
          path="/bitacora"
          element={<ProtectedRoute roles={VISTAS.bitacora}><Bitacora /></ProtectedRoute>}
        />

        <Route 
          path="/por-firmar" 
          element={
            <ProtectedRoute roles={VISTAS.porFirmar}>
              <PorFirmar />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}