import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { SelectField, TextField } from "../reutilizables/Field";
import logoFge from '../assets/FISCALIA_LOGO.png';

import "./Auth.css";

const ROLES = ["Administrador", "Mesa de partes", "Perito", "Consulta"];

export default function CrearCuenta() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    usuario: "",
    contrasena: "",
    nombre: "",
    apellidos: "",
    rol: "",
    materia: "",
  });
  const [biometricoListo, setBiometricoListo] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const esPerito = form.rol === "Perito";

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleRegistroBiometrico() {
    // Aquí se integraría el SDK de captura biométrica (cámara / lector).
    // Por ahora solo marcamos el paso como completado.
    setBiometricoListo(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.usuario || !form.contrasena || !form.nombre || !form.apellidos || !form.rol) {
      setError("Usuario, contraseña, nombre, apellidos y rol son obligatorios.");
      return;
    }
    if (esPerito && !form.materia) {
      setError("La materia es obligatoria para el rol de perito.");
      return;
    }
    if (!biometricoListo) {
      setError("Completa el registro biométrico antes de crear la cuenta.");
      return;
    }
    setLoading(true);
    try {
      await authApi.registrar({ ...form, biometrico: true });
      navigate("/login");
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-side">
        <div className="auth-logo-circle">
           <img src={logoFge} alt="Fiscalía General del Estado de Morelos" className="shell-brand-shield" />
          <div>
            <strong>MORELOS</strong>
            <span>Fiscalía General del Estado</span>
          </div>
        </div>
      </div>
      <div className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-title">
            <h2>Crear cuenta</h2>
            <p>Registra tus datos para continuar</p>
          </div>

          {error ? <div className="status-banner error">{error}</div> : null}

          <TextField
            label="Usuario"
            hint="Correo o nombre de usuario para iniciar sesión"
            value={form.usuario}
            onChange={(e) => update("usuario", e.target.value)}
            required
          />
          <TextField
            label="Contraseña"
            type="password"
            value={form.contrasena}
            onChange={(e) => update("contrasena", e.target.value)}
            required
          />
          <TextField
            label="Nombre(s)"
            value={form.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            required
          />
          <TextField
            label="Apellidos"
            value={form.apellidos}
            onChange={(e) => update("apellidos", e.target.value)}
            required
          />
          <SelectField
            label="Rol"
            options={ROLES}
            value={form.rol}
            onChange={(e) => update("rol", e.target.value)}
            required
          />
          <TextField
            label="Materia"
            hint="Llenar solo en caso de ser perito"
            value={form.materia}
            onChange={(e) => update("materia", e.target.value)}
            disabled={!esPerito}
          />

          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRegistroBiometrico}
            >
              {biometricoListo ? "Biometría registrada ✓" : "Registro biométrico"}
            </button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </div>
          <span className="field-hint">*Campo obligatorio*</span>
          <p className="auth-alt">Aviso de consentimiento de datos biométricos</p>
        </form>
      </div>
    </div>
  );
}
