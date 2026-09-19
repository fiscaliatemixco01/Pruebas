import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoFge from '../assets/FISCALIA_LOGO.png';
import iconoRostro from '../assets/FACE_ID.png';
import "./Auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(usuario, contrasena);
      navigate("/");
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-side">
        <div className="auth-logo-circle">
          <img src={logoFge} alt="Logo Fiscalía" />
        </div>
      </div>
      <div className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit}>
          <img src={iconoRostro} alt="Icono Biométrico" className="face-icon" />

          {error ? <div className="status-banner error">{error}</div> : null}

          <label className="field">
            <span className="field-label">Usuario</span>
            <input
              className="field-input"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="usuario@fgemorelos.gob.mx"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Contraseña</span>
            <input
              className="field-input"
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </label>

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Inicio de sesión"}
          </button>

          <p className="auth-alt">
            ¿No tienes una cuenta? <Link to="/crear-cuenta">Crear cuenta</Link>
          </p>
        </form>
      </div>
    </div>
  );
}