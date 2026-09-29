import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./reutilizables/ProtectedRoute";

import Estadisticas from "./paginas/Estadisticas";
import Notificaciones from "./paginas/Notificaciones";
import PeticionPerito from "./paginas/PeticionPerito";
// import ComingSoon from "./paginas/ComingSoon"; 
import Login from "./paginas/login";
import CrearCuenta from "./paginas/CrearCuenta";
import Home from "./paginas/Home";
import NuevaPeticion from "./paginas/NuevaPeticion";
import BuscarPeticion from "./paginas/BuscarPeticion";
import EditarPeticion from "./paginas/EditarPeticion";
import Bitacora from "./paginas/Bitacora";
import Usuarios from "./paginas/Usuarios";
import Carpetas from "./paginas/Carpetas";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/crear-cuenta" element={<CrearCuenta />} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        <Route
          path="/peticiones/nueva"
          element={
            <ProtectedRoute roles={["Administrador", "Receptor"]}>
              <NuevaPeticion />
            </ProtectedRoute>
          }
        />

        <Route
          path="/peticiones/buscar"
          element={<ProtectedRoute><BuscarPeticion /></ProtectedRoute>}
        />

        <Route
          path="/peticiones/editar"
          element={
            <ProtectedRoute roles={["Administrador", "Receptor"]}>
              <EditarPeticion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/peticiones/editar/:id"
          element={<ProtectedRoute><EditarPeticion /></ProtectedRoute>}
        />

        <Route
          path="/bitacora"
          element={
            <ProtectedRoute roles={["Administrador"]}>
              <Bitacora />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={["Administrador"]}>
              <Usuarios />
            </ProtectedRoute>
          }
        />


      <Route
        path="/estadisticas"
        element={
          <ProtectedRoute roles={["Administrador"]}>
            <Estadisticas />
          </ProtectedRoute>
        }
      />

      <Route
        path="/carpetas"
        element={<ProtectedRoute><Carpetas /></ProtectedRoute>}
      />

      <Route
        path="/notificaciones"
        element={<ProtectedRoute><Notificaciones /></ProtectedRoute>}
      />

      <Route
        path="/peticiones/perito"
        element={
          <ProtectedRoute roles={["Perito"]}>
            <PeticionPerito />
          </ProtectedRoute>
        }
      />
      
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}