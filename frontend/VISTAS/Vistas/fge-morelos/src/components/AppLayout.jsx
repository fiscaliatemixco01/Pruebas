import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, iniciales } from "../context/AuthContext";
import "./AppLayout.css";

const NAV_ITEMS = [
  { to: "/peticiones/nueva", label: "Registrar petición" },
  { to: "/peticiones/buscar", label: "Buscar" },
  { to: "/peticiones/editar", label: "Editar" },
  { to: "/bitacora", label: "Bitácora" },
  { to: "/usuarios", label: "Usuarios" },
];

export default function AppLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-brand">
          <img src="/logo-fge.png" alt="Fiscalía General del Estado de Morelos" className="shell-brand-shield" />
        </div>
        {title ? <h1 className="shell-title">{title}</h1> : <span />}
        <div className="shell-avatar" title={user ? `${user.nombre} ${user.apellidos}` : ""}>
          {iniciales(user)}
        </div>
      </header>

      <div className="shell-body">
        <nav className="shell-nav">
          <div className="shell-nav-links">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => "shell-nav-btn" + (isActive ? " is-active" : "")}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <button type="button" className="shell-nav-btn shell-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </nav>

        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
