import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../reutilizables/AppLayout";
import { peticionesApi } from "../api/peticiones";
import PeticionWizard from "./PeticionWizard";

export default function EditarPeticion() {
  const { id: idFromRoute } = useParams();
  const navigate = useNavigate();

  const [numeroLlamado, setNumeroLlamado] = useState("");
  const [peticion, setPeticion] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (idFromRoute) cargarPorId(idFromRoute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromRoute]);

  async function cargarPorId(id) {
    setError("");
    setLoading(true);
    try {
      const data = await peticionesApi.obtener(id);
      setPeticion(data);
    } catch (err) {
      setError(err.message || "No se encontró la petición.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuscar(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const resultados = await peticionesApi.buscar({ numero_llamado: numeroLlamado });
      if (!resultados.length) {
        setError("No se encontró ninguna petición con ese número de llamado.");
        setPeticion(null);
      } else {
        setPeticion(resultados[0]);
      }
    } catch (err) {
      setError(err.message || "No se pudo completar la búsqueda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout title="Editar petición">
      {!peticion && (
        <form className="card" onSubmit={handleBuscar}>
          <div className="search-row" style={{ marginBottom: 0 }}>
            <label>Número de llamado:</label>
            <input
              className="field-input"
              value={numeroLlamado}
              onChange={(e) => setNumeroLlamado(e.target.value)}
              placeholder="Ej. FM001/26"
              required
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </form>
      )}

      {error ? <div className="status-banner error" style={{ marginTop: 20 }}>{error}</div> : null}

      {peticion && (
        <>
          <div className="btn-row" style={{ marginBottom: 16 }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setPeticion(null);
                setNumeroLlamado("");
              }}
            >
              Buscar otra petición
            </button>
          </div>
          <PeticionWizard
            mode="editar"
            initialData={peticion}
            onSaved={() => navigate("/peticiones/buscar")}
          />
        </>
      )}
    </AppLayout>
  );
}
