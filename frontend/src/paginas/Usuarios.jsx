import { useEffect, useState } from "react";
import AppLayout from "../reutilizables/AppLayout";
import { usuariosApi } from "../api/usuarios";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usuariosApi
      .listar()
      .then(setUsuarios)
      .catch((err) => setError(err.message || "No se pudo cargar la lista de usuarios."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Usuarios">
      {error ? <div className="status-banner error">{error}</div> : null}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Materia</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="table-empty" colSpan={3}>Cargando...</td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={3}>No hay usuarios registrados.</td>
              </tr>
            ) : (
              usuarios.map((u, i) => (
                <tr key={u.id ?? i}>
                  <td>{u.nombre} {u.apellidos}</td>
                  <td>{u.rol}</td>
                  <td>{u.materia || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
