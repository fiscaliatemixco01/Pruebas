import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../reutilizables/AppLayout";
import { peticionesApi } from "../api/peticiones";
import { SelectField } from "../reutilizables/Field";

const TIPOS = [
  { value: "dictamen", label: "Dictamen" },
  { value: "informe", label: "Informe" },
  { value: "requerimiento", label: "Requerimiento" },
];

const fmtFecha = (f) => (f ? String(f).slice(0, 10) : "");
const fmtHora = (h) => (h ? String(h).slice(0, 8) : "");

export default function PeticionPerito() {
  const { id } = useParams();

  const [peticion, setPeticion] = useState(null);
  const [entrega, setEntrega] = useState(null);
  const [tipo, setTipo] = useState("");
  const [archivo, setArchivo] = useState(null);

  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargar() {
    setError("");
    setLoading(true);
    try {
      const [datosPeticion, datosEntrega] = await Promise.all([
        peticionesApi.obtener(id),
        peticionesApi.obtenerEntrega(id).catch(() => null),
      ]);
      setPeticion(datosPeticion);
      setEntrega(datosEntrega);
      setTipo(datosEntrega?.tipo || "");
    } catch (err) {
      setError(err.message || "No se encontró la petición.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubir(e) {
    e.preventDefault();
    setError("");
    setAviso("");
    if (!tipo) {
      setError("Selecciona qué vas a entregar: dictamen, informe o requerimiento.");
      return;
    }
    if (!archivo) {
      setError("Adjunta el PDF de la entrega.");
      return;
    }
    if (archivo.type !== "application/pdf") {
      setError("El archivo debe ser un PDF.");
      return;
    }
    setSubiendo(true);
    try {
      const guardada = await peticionesApi.subirEntrega(id, { tipo, archivo });
      setEntrega(guardada);
      setArchivo(null);
      e.target.reset?.();
      setAviso("Entrega subida correctamente.");
    } catch (err) {
      setError(err.message || "No se pudo subir la entrega.");
    } finally {
      setSubiendo(false);
    }
  }

  async function handleVerPdf() {
    setError("");
    try {
      const blob = await peticionesApi.descargarEntrega(id);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (err) {
      setError(err.message || "No se pudo abrir el PDF.");
    }
  }

  return (
    <AppLayout title="Petición asignada">
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <Link className="btn btn-secondary" to="/notificaciones">
          Volver a Notificaciones
        </Link>
      </div>

      {error ? <div className="status-banner error">{error}</div> : null}
      {aviso ? <div className="status-banner success">{aviso}</div> : null}

      {loading ? (
        <div className="card table-empty">Cargando...</div>
      ) : !peticion ? null : (
        <>
          <div className="card">
            <div className="page-heading" style={{ marginBottom: 16 }}>
              <h2>{peticion.numero_llamado}</h2>
              <p>Datos capturados por Mesa de partes. Solo lectura.</p>
            </div>
            <div className="detalle-grid">
              <div>
                <span className="label">Fecha recibido</span>
                <span className="value">{fmtFecha(peticion.fecha_recibido)}</span>
              </div>
              <div>
                <span className="label">Hora recibido</span>
                <span className="value">{fmtHora(peticion.hora_recibido)}</span>
              </div>
              <div>
                <span className="label">Materia</span>
                <span className="value">{peticion.materia}</span>
              </div>
              <div>
                <span className="label">Número de carpeta</span>
                <span className="value">{peticion.numero_carpeta}</span>
              </div>
              <div>
                <span className="label">Ministerio público</span>
                <span className="value">{peticion.nombre_ministerio_publico}</span>
              </div>
              <div>
                <span className="label">Detenido</span>
                <span className="value">{peticion.estatus_detenido}</span>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="label">Descripción de lo que solicita el MP</span>
              <p style={{ marginTop: 6 }}>{peticion.descripcion_solicitud}</p>
            </div>
          </div>

          <div className="card">
            <div className="page-heading" style={{ marginBottom: 16 }}>
              <h2>Tu entrega</h2>
              <p>Selecciona qué vas a entregar para esta petición y sube el PDF correspondiente.</p>
            </div>

            {entrega ? (
              <div className="btn-row" style={{ marginBottom: 20, alignItems: "center" }}>
                <span className="badge badge-done">
                  Entregado · {TIPOS.find((t) => t.value === entrega.tipo)?.label}
                </span>
                <span className="field-hint" style={{ margin: 0 }}>
                  {entrega.archivo_nombre} · subido el{" "}
                  {new Date(entrega.subido_en).toLocaleString("es-MX")}
                </span>
                <button type="button" className="btn btn-secondary" onClick={handleVerPdf}>
                  Ver PDF
                </button>
              </div>
            ) : (
              <div className="btn-row" style={{ marginBottom: 20 }}>
                <span className="badge badge-pending">Pendiente de entrega</span>
              </div>
            )}

            <form onSubmit={handleSubir}>
              <div className="form-grid two-col" style={{ marginBottom: 16 }}>
                <SelectField
                  label="¿Qué vas a entregar?"
                  options={TIPOS}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  required
                />
              </div>

              <div className="file-input-row">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                />
                <span className="field-hint" style={{ margin: 0 }}>
                  Solo PDF, máximo 20 MB.
                </span>
              </div>

              <div className="btn-row end" style={{ marginTop: 20 }}>
                <button className="btn btn-primary" type="submit" disabled={subiendo}>
                  {subiendo ? "Subiendo..." : entrega ? "Reemplazar PDF" : "Subir PDF"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </AppLayout>
  );
}