import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../reutilizables/AppLayout";
import { carpetasApi } from "../api/carpetas";
import { peticionesApi } from "../api/peticiones";
import { useAuth } from "../context/AuthContext";

export default function Carpetas() {
  const { user } = useAuth();
  const esAdmin = user?.rol === "Administrador";

  const [carpetas, setCarpetas] = useState([]);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [seleccionada, setSeleccionada] = useState(null);
  const [peticiones, setPeticiones] = useState([]);
  const [cargandoPeticiones, setCargandoPeticiones] = useState(false);
  const [errorPeticiones, setErrorPeticiones] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  function cargar() {
    setLoading(true);
    carpetasApi
      .listar()
      .then(setCarpetas)
      .catch((err) => setError(err.message || "No se pudo cargar la lista de carpetas."))
      .finally(() => setLoading(false));
  }

  async function handleCrear(e) {
    e.preventDefault();
    setError("");
    setAviso("");
    if (!nuevaCarpeta.trim()) {
      setError("El número de carpeta es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      await carpetasApi.crear(nuevaCarpeta.trim());
      setAviso("Carpeta creada correctamente.");
      setNuevaCarpeta("");
      cargar();
    } catch (err) {
      setError(err.message || "No se pudo crear la carpeta.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id) {
    setError("");
    setAviso("");
    try {
      await carpetasApi.eliminar(id);
      setCarpetas((prev) => prev.filter((c) => c.id !== id));
      if (seleccionada?.id === id) {
        setSeleccionada(null);
        setPeticiones([]);
      }
    } catch (err) {
      setError(err.message || "No se pudo eliminar la carpeta.");
    }
  }

  function verContenido(carpeta) {
    if (seleccionada?.id === carpeta.id) {
      setSeleccionada(null);
      setPeticiones([]);
      return;
    }
    setSeleccionada(carpeta);
    setErrorPeticiones("");
    setCargandoPeticiones(true);
    peticionesApi
      .buscar({ numero_carpeta: carpeta.numero_carpeta })
      .then(setPeticiones)
      .catch((err) => {
        setErrorPeticiones(err.message || "No se pudo cargar el contenido de la carpeta.");
        setPeticiones([]);
      })
      .finally(() => setCargandoPeticiones(false));
  }

  return (
    <AppLayout title="Carpetas">
      {esAdmin && (
        <form className="card" onSubmit={handleCrear}>
          <div className="search-row" style={{ marginBottom: 0 }}>
            <label>Número de carpeta:</label>
            <input
              className="field-input"
              value={nuevaCarpeta}
              onChange={(e) => setNuevaCarpeta(e.target.value)}
              placeholder="Ej. 123/2026"
              required
            />
            <button className="btn btn-primary" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Agregar carpeta"}
            </button>
          </div>
        </form>
      )}

      {error ? <div className="status-banner error" style={{ marginTop: 16 }}>{error}</div> : null}
      {aviso ? <div className="status-banner success" style={{ marginTop: 16 }}>{aviso}</div> : null}

      <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Número de carpeta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="table-empty" colSpan={2}>Cargando...</td>
              </tr>
            ) : carpetas.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={2}>No hay carpetas registradas.</td>
              </tr>
            ) : (
              carpetas.map((c) => (
                <tr
                  key={c.id}
                  className={seleccionada?.id === c.id ? "is-active" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={() => verContenido(c)}
                >
                  <td>{c.numero_carpeta}</td>
                  <td style={{ textAlign: "right" }}>
                    {esAdmin && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminar(c.id);
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {seleccionada && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Contenido de la carpeta {seleccionada.numero_carpeta}</h3>

          {errorPeticiones ? <div className="status-banner error">{errorPeticiones}</div> : null}

          {cargandoPeticiones ? (
            <div className="table-empty">Cargando...</div>
          ) : peticiones.length === 0 ? (
            <div className="table-empty">Esta carpeta todavía no tiene ninguna petición guardada.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {peticiones.map((p) => (
                <div key={p.id} className="card result-card">
                  <div className="result-card-meta">
                    <div>
                      <span className="label">Llamado</span>
                      <span className="value">{p.numero_llamado}</span>
                    </div>
                    <div>
                      <span className="label">Fecha</span>
                      <span className="value">{p.fecha_recibido}</span>
                    </div>
                    <div>
                      <span className="label">Perito</span>
                      <span className="value">{p.nombre_perito || "Sin asignar"}</span>
                    </div>
                    <div>
                      <span className="label">Materia</span>
                      <span className="value">{p.materia}</span>
                    </div>
                    <div>
                      <span className="label">MP</span>
                      <span className="value">{p.nombre_ministerio_publico}</span>
                    </div>
                  </div>
                  <Link className="btn btn-secondary" to={`/peticiones/editar/${p.id}`}>
                    {esAdmin ? "Ver / editar" : "Ver"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}