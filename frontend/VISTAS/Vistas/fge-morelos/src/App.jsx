import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import CrearCuenta from "./pages/CrearCuenta";
import Home from "./pages/Home";
import NuevaPeticion from "./pages/NuevaPeticion";
import BuscarPeticion from "./pages/BuscarPeticion";
import EditarPeticion from "./pages/EditarPeticion";
import Bitacora from "./pages/Bitacora";
import Usuarios from "./pages/Usuarios";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/crear-cuenta" element={<CrearCuenta />} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/peticiones/nueva" element={<ProtectedRoute><NuevaPeticion /></ProtectedRoute>} />
        <Route path="/peticiones/buscar" element={<ProtectedRoute><BuscarPeticion /></ProtectedRoute>} />
        <Route path="/peticiones/editar" element={<ProtectedRoute><EditarPeticion /></ProtectedRoute>} />
        <Route path="/peticiones/editar/:id" element={<ProtectedRoute><EditarPeticion /></ProtectedRoute>} />
        <Route path="/bitacora" element={<ProtectedRoute><Bitacora /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
