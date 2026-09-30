import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Si la ruta define roles y el del usuario no está incluido, va a Inicio.
  // "/" permite a todos los roles, así que no hay riesgo de redirección infinita.
  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}