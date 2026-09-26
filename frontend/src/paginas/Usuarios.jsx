import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../reutilizables/AppLayout";
import { usuariosApi } from "../api/usuarios";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editandoId, setEditandoId] = useState(null);
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  function cargar() {
    setLoading(true);
    usuariosApi
      .listar()
      .then(setUsuarios)
      .catch((err) => setError(err.message || "No se pudo cargar la lista de usuarios."))
      .finally(() => setLoading(false));
  }

  function iniciarCambioContrasena(id) {
    setAviso("");
    setEditandoId(id);
    setNuevaContrasena("");
  }

  function cancelarCambioContrasena() {
    setEditandoId(null);
    setNuevaContrasena("");
  }

  async function guardarContrasena(id) {
    if (!nuevaContrasena || nuevaContrasena.length < 6) {
      setAviso("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setGuardando(true);
    setAviso("");
    try {
      await usuariosApi.cambiarContrasena(id, nuevaContrasena);
      setAviso("Contraseña actualizada correctamente.");
      cancelarCambioContrasena();
    } catch (err) {
      setAviso(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AppLayout title="Personal">
      <div className="btn-row" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
        <Link className="btn btn-primary" to="/usuarios/crear-cuenta">
          Crear cuenta
        </Link>
      </div>

      {error ? <div className="status-banner error">{error}</div> : null}
      {aviso ? <div className="status-banner success">{aviso}</div> : null}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Materia</th>
              <th>Correo</th>
              <th>Contraseña</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="table-empty" colSpan={5}>Cargando...</td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={5}>No hay usuarios registrados.</td>
              </tr>
            ) : (
              usuarios.map((u, i) => (
                <tr key={u.id ?? i}>
                  <td>{u.nombre} {u.apellidos}</td>
                  <td>{u.rol}</td>
                  <td>{u.materia || "—"}</td>
                  <td>{u.correo || "—"}</td>
                  <td>
                    {editandoId === u.id ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="password"
                          className="field-input"
                          placeholder="Nueva contraseña"
                          value={nuevaContrasena}
                          onChange={(e) => setNuevaContrasena(e.target.value)}
                          style={{ minWidth: 150 }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={guardando}
                          onClick={() => guardarContrasena(u.id)}
                        >
                          Guardar
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={cancelarCambioContrasena}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span>••••••••</span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => iniciarCambioContrasena(u.id)}
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
