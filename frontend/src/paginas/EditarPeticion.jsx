import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../reutilizables/AppLayout";
import { peticionesApi } from "../api/peticiones";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PeticionWizard from "./PeticionWizard";

const fmtFecha = (f) => (f ? String(f).slice(0, 10) : "");
const fmtHora = (h) => (h ? String(h).slice(0, 8) : "");

function Dato({ label, value }) {
  return (
    <div>
      <span className="label">{label}</span>
      <span className="value">{value || "—"}</span>
    </div>
  );
}

export default function EditarPeticion() {
  const { id: idFromRoute } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const esAdmin = user?.rol === "Administrador";
  const esPerito = user?.rol === "Perito";

  const [numeroLlamado, setNumeroLlamado] = useState("");
  const [peticion, setPeticion] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // PDF
  const [archivo, setArchivo] = useState(null);
  const [tipo, setTipo] = useState("dictamen");
  const [subiendo, setSubiendo] = useState(false);
  const [msgPdf, setMsgPdf] = useState("");
  const [errPdf, setErrPdf] = useState("");

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

  async function subirPdf(e) {
    e.preventDefault();
    setMsgPdf("");
    setErrPdf("");
    if (!archivo) {
      setErrPdf("Selecciona un archivo PDF.");
      return;
    }
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("tipo", tipo);
    setSubiendo(true);
    try {
      await api.postForm(`/peticiones/${peticion.id}/entrega`, fd);
      setMsgPdf("PDF subido correctamente.");
      setArchivo(null);
      e.target.reset();
    } catch (err) {
      setErrPdf(err.message || "No se pudo subir el PDF.");
    } finally {
      setSubiendo(false);
    }
  }

  async function descargarPdf() {
    setMsgPdf("");
    setErrPdf("");
    try {
      const blob = await api.getBlob(`/peticiones/${peticion.id}/entrega/archivo`);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      setErrPdf(err.message || "No se pudo abrir el PDF.");
    }
  }

  return (
    <AppLayout title={esAdmin ? "Editar petición" : "Ver petición"}>
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
                setMsgPdf("");
                setErrPdf("");
                if (idFromRoute) navigate(esAdmin ? "/peticiones/editar" : -1);
              }}
            >
              {esAdmin ? "Buscar otra petición" : "Volver"}
            </button>
          </div>

          {esAdmin ? (
            <PeticionWizard
              mode="editar"
              initialData={peticion}
              onSaved={() => navigate("/peticiones/buscar")}
            />
          ) : (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Petición {peticion.numero_llamado}</h3>
              <div className="result-card-meta" style={{ flexWrap: "wrap", gap: 16 }}>
                <Dato label="Tipo de llamado" value={peticion.tipo_llamado} />
                <Dato label="Fecha recibido" value={fmtFecha(peticion.fecha_recibido)} />
                <Dato label="Hora recibido" value={fmtHora(peticion.hora_recibido)} />
                <Dato label="Receptor" value={peticion.nombre_receptor} />
                <Dato label="Ministerio Público" value={peticion.nombre_ministerio_publico} />
                <Dato label="Detenido" value={peticion.estatus_detenido} />
                <Dato label="Materia" value={peticion.materia} />
                <Dato label="Carpeta" value={peticion.numero_carpeta} />
                <Dato label="Perito" value={peticion.nombre_perito || "Sin asignar"} />
                <Dato label="Recibe entrega" value={peticion.nombre_quien_recibe || "Sin asignar"} />
              </div>
              <div style={{ marginTop: 16 }}>
                <span className="label">Descripción de la solicitud</span>
                <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>
                  {peticion.descripcion_solicitud}
                </p>
              </div>
              <div style={{ marginTop: 16 }}>
                <Dato
                  label="Entregas"
                  value={
                    [
                      peticion.entrega_dictamen && "Dictamen",
                      peticion.entrega_informe && "Informe",
                      peticion.entrega_requerimiento && "Requerimiento",
                    ]
                      .filter(Boolean)
                      .join(", ") || "Ninguna"
                  }
                />
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Entrega (PDF)</h3>

            {errPdf ? <div className="status-banner error">{errPdf}</div> : null}
            {msgPdf ? <div className="status-banner success">{msgPdf}</div> : null}

            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={descargarPdf}>
                Ver PDF cargado
              </button>
            </div>

            {(esPerito || esAdmin) && (
              <form onSubmit={subirPdf}>
                <div className="search-row" style={{ marginBottom: 0 }}>
                  <select
                    className="field-input"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    <option value="dictamen">Dictamen</option>
                    <option value="informe">Informe</option>
                    <option value="requerimiento">Requerimiento</option>
                  </select>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setArchivo(e.target.files[0] || null)}
                  />
                  <button className="btn btn-primary" type="submit" disabled={subiendo}>
                    {subiendo ? "Subiendo..." : "Subir PDF"}
                  </button>
                </div>
                <span className="field-hint">Si ya había un PDF, el nuevo lo reemplaza.</span>
              </form>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}