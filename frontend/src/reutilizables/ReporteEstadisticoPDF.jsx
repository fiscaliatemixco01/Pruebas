import { useMemo, useState } from "react";
import { SelectField } from "./Field";
import { api } from "../api/client";

/* Descarga el PDF de informes periciales (solicitados y realizados) por materia y mes */
export default function ReporteEstadisticoPDF() {
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  const opcionesAnio = useMemo(() => {
    const actual = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => {
      const a = actual - i;
      return { value: String(a), label: String(a) };
    });
  }, []);

  async function descargar() {
    setError("");
    setDescargando(true);
    try {
      const blob = await api.getBlob(`/peticiones/reporte-estadistico?anio=${anio}`);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `informes-periciales-${anio}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "No se pudo generar el PDF.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="card">
      <div className="page-heading" style={{ marginBottom: 16 }}>
        <h2>Informes periciales en PDF</h2>
        <p>Informes solicitados y realizados por materia y mes del año que elijas, con sus totales.</p>
      </div>

      {error ? <div className="status-banner error">{error}</div> : null}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <SelectField
          label="Año"
          options={opcionesAnio}
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={descargar} disabled={descargando}>
          {descargando ? "Generando..." : "Descargar PDF"}
        </button>
      </div>
    </div>
  );
}