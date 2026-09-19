import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

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

        <Route path="/" element={<Home />} />
        <Route path="/peticiones/nueva" element={<NuevaPeticion />} />
        <Route path="/peticiones/buscar" element={<BuscarPeticion />} />
        <Route path="/peticiones/editar" element={<EditarPeticion />} />
        <Route path="/peticiones/editar/:id" element={<EditarPeticion />} />
        <Route path="/bitacora" element={<Bitacora />} />
        <Route path="/usuarios" element={<Usuarios />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
