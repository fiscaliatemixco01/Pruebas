import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
          <img src="/fge-shield.svg" alt="" />
          <div>
            <strong>MORELOS</strong>
            <span>Fiscalía General del Estado</span>
          </div>
        </div>
      </div>
      <div className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-face-icon" aria-hidden="true">
            <svg viewBox="0 0 100 100" width="72" height="72">
              <path d="M20 30 V22 A6 6 0 0 1 26 16 H34" fill="none" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
              <path d="M80 30 V22 A6 6 0 0 0 74 16 H66" fill="none" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
              <path d="M20 70 V78 A6 6 0 0 0 26 84 H34" fill="none" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
              <path d="M80 70 V78 A6 6 0 0 1 74 84 H66" fill="none" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
              <line x1="38" y1="42" x2="38" y2="50" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
              <line x1="62" y1="42" x2="62" y2="50" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
              <path d="M50 42 V58 H46" fill="none" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
              <path d="M38 66 Q50 74 62 66" fill="none" stroke="#1c2333" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

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
