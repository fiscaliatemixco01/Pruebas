import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./reutilizables/ProtectedRoute";

import Login from "./paginas/Login";
import CrearCuenta from "./paginas/CrearCuenta";
import Home from "./paginas/Home";
import NuevaPeticion from "./paginas/NuevaPeticion";
import BuscarPeticion from "./paginas/BuscarPeticion";
import EditarPeticion from "./paginas/EditarPeticion";
import Bitacora from "./paginas/Bitacora";
import Usuarios from "./paginas/Usuarios";

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}