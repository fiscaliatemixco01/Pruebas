import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, iniciales } from "../context/AuthContext";
import logoFge from '../assets/FISCALIA_LOGO.png';
import "./AppLayout.css";

const NAV_ITEMS = [
  { to: "/peticiones/nueva", label: "Registrar petición", roles: ["Administrador", "Receptor"] },
  { to: "/peticiones/buscar", label: "Buscar", roles: ["Administrador", "Receptor", "Perito"] },
  { to: "/peticiones/editar", label: "Editar", roles: ["Administrador", "Receptor"] },
  { to: "/bitacora", label: "Bitácora", roles: ["Administrador"] },
  { to: "/usuarios", label: "Usuarios", roles: ["Administrador"] },
];

export default function AppLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.rol));

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-brand">
          <img src={logoFge} alt="Fiscalía General del Estado de Morelos" className="shell-brand-shield" />
        </div>
        {title ? <h1 className="shell-title">{title}</h1> : <span />}
        <div className="shell-avatar" title={user ? `${user.nombre} ${user.apellidos}` : ""}>
          {iniciales(user)}
        </div>
      </header>

      <div className="shell-body">
        <nav className="shell-nav">
          <div className="shell-nav-links">
            {visibleItems.map((item) => (
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