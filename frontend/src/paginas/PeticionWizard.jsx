import { useEffect, useState } from "react";
import { peticionesApi } from "../api/peticiones";
import { usuariosApi } from "../api/usuarios";
import { carpetasApi } from "../api/carpetas";
import { useAuth } from "../context/AuthContext";
import { RadioGroup, SelectField, TextArea, TextField } from "../reutilizables/Field";

const emptyForm = {
  llamado_id: "",
  numero_llamado_manual: "",
  zona_apoyo: "", // FMAP: "ZO" o "JO"
  numero_apoyo: "", // FMAP: solo dígitos
  receptor_id: "",
  nombre_ministerio_publico: "",
  con_detenido: false,
  materia_id: "",
  numero_carpeta: "",
  descripcion_solicitud: "",
  perito_id: "",
};

const OPCIONES_ZONA = [
  { value: "ZO", label: "Cuautla (ZO)" },
  { value: "JO", label: "Jojutla (JO)" },
];

// "2026-09-29T06:00:00.000Z" -> "2026-09-29" ; "13:01:28.411176" -> "13:01:28"
const fmt = (v) => {
  if (typeof v !== "string") return v;
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  if (/^\d{2}:\d{2}:\d{2}/.test(v)) return v.slice(0, 8);
  return v;
};

/**
 * mode: "nueva" | "editar"
 * initialData: registro existente (viene de vw_peticiones) cuando mode === "editar"
 * onSaved: callback cuando se guarda con éxito
 */
export default function PeticionWizard({ mode = "nueva", initialData = null, onSaved }) {
  const esEdicion = mode === "editar";
  const { user } = useAuth();
  // En edición, solo el Administrador puede modificar
  const soloLectura = esEdicion && user?.rol !== "Administrador";

  const peticionId = initialData?.id ?? null;

  const [meta] = useState({
    numero_llamado: initialData?.numero_llamado ?? "Se genera automáticamente",
    fecha_recibido: initialData?.fecha_recibido ?? "Se genera automáticamente",
    hora_recibido: initialData?.hora_recibido ?? "Se genera automáticamente",
    tipo_llamado: initialData?.tipo_llamado ?? "",
  });

  const [form, setForm] = useState({
    ...emptyForm,
    ...(initialData
      ? {
          llamado_id: initialData.llamado_id ?? "",
          receptor_id: initialData.receptor_id ?? "",
          nombre_ministerio_publico: initialData.nombre_ministerio_publico ?? "",
          con_detenido: Boolean(initialData.con_detenido),
          materia_id: initialData.materia_id ?? "",
          numero_carpeta: initialData.numero_carpeta ?? "",
          descripcion_solicitud: initialData.descripcion_solicitud ?? "",
          perito_id: initialData.perito_id ?? "",
        }
      : {}),
  });

  const [materias, setMaterias] = useState([]);
  const [peritos, setPeritos] = useState([]);
  const [llamados, setLlamados] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carpetas, setCarpetas] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Catálogos que no dependen de nada
  useEffect(() => {
    peticionesApi.listarPeritos().then(setPeritos).catch(() => setPeritos([]));
    peticionesApi.listarLlamados().then(setLlamados).catch(() => setLlamados([]));
    usuariosApi.listar().then(setUsuarios).catch(() => setUsuarios([]));
    carpetasApi.listar().then(setCarpetas).catch(() => setCarpetas([]));
  }, []);

  // Materias: solo las del llamado seleccionado
  useEffect(() => {
    if (!form.llamado_id) {
      setMaterias([]);
      return;
    }
    peticionesApi
      .listarMaterias(form.llamado_id)
      .then(setMaterias)
      .catch(() => setMaterias([]));
  }, [form.llamado_id]);

  const llamadoSeleccionado = llamados.find((l) => String(l.id) === String(form.llamado_id));
  const requiereNumeroManual = llamadoSeleccionado ? !llamadoSeleccionado.es_automatico : false;
  const esApoyo = llamadoSeleccionado?.codigo === "FMAP";
  const numeroManual = esApoyo
    ? `${form.zona_apoyo}/${form.numero_apoyo.trim()}`
    : form.numero_llamado_manual.trim();
  const etiquetaNumero =
    esApoyo || meta.tipo_llamado === "FMAP" ? "Número de apoyo" : "Número de llamado";

  const opcionesUsuarios = usuarios.map((u) => ({
    value: u.id,
    label: [u.nombre, u.apellidos].filter(Boolean).join(" "),
  }));
  const opcionesMaterias = materias.map((m) => ({ value: m.id, label: m.nombre }));
  const opcionesPeritos = peritos.map((p) => ({ value: p.id, label: p.nombre }));
  const opcionesLlamados = llamados.map((l) => ({
    value: l.id,
    label: l.es_automatico ? l.codigo : `${l.codigo} (captura manual)`,
  }));
  const opcionesCarpetas = carpetas.map((c) => ({ value: c.numero_carpeta, label: c.numero_carpeta }));

  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function validar() {
    if (
      !form.llamado_id ||
      !form.receptor_id ||
      !form.nombre_ministerio_publico ||
      !form.materia_id ||
      !form.numero_carpeta ||
      !form.descripcion_solicitud
    ) {
      return "Llamado, receptor, nombre del MP, materia, número de carpeta y descripción son obligatorios.";
    }
    // El número manual solo se captura al crear, no al editar
    if (!esEdicion && requiereNumeroManual) {
      if (esApoyo) {
        if (!form.zona_apoyo || !/^\d+$/.test(form.numero_apoyo.trim())) {
          return "Para FMAP selecciona la zona y captura el número de apoyo (solo dígitos).";
        }
      } else if (!form.numero_llamado_manual.trim()) {
        return `Para el llamado ${llamadoSeleccionado.codigo} debes capturar el número de llamado manualmente.`;
      }
    }
    return "";
  }

  async function handleGuardarNueva(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }
    setLoading(true);
    try {
      const creada = await peticionesApi.crear({
        llamado_id: form.llamado_id,
        numero_llamado: requiereNumeroManual ? numeroManual : undefined,
        receptor_id: form.receptor_id,
        nombre_ministerio_publico: form.nombre_ministerio_publico,
        con_detenido: form.con_detenido,
        materia_id: form.materia_id,
        numero_carpeta: form.numero_carpeta,
        descripcion_solicitud: form.descripcion_solicitud,
        perito_id: form.perito_id || null,
      });
      setSuccess("Registro guardado correctamente.");
      onSaved?.(creada);
    } catch (err) {
      setError(err.message || "No se pudo guardar el registro.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardarEdicion(e) {
    e.preventDefault();
    if (soloLectura) return;
    setError("");
    setSuccess("");
    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }
    setLoading(true);
    try {
      const saved = await peticionesApi.completar(peticionId, {
        receptor_id: form.receptor_id,
        nombre_ministerio_publico: form.nombre_ministerio_publico,
        con_detenido: form.con_detenido,
        materia_id: form.materia_id,
        numero_carpeta: form.numero_carpeta,
        descripcion_solicitud: form.descripcion_solicitud,
        perito_id: form.perito_id || null,
      });
      setSuccess("Cambios guardados correctamente.");
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  }

  const bloqueDatosLlamado = (
    <div className="form-grid two-col" style={{ marginBottom: 24 }}>
      <TextField label={etiquetaNumero} value={meta.numero_llamado} readOnly disabled className="field-readonly" />
      <TextField label="Fecha" value={fmt(meta.fecha_recibido)} readOnly disabled className="field-readonly" />
      <TextField label="Hora" value={fmt(meta.hora_recibido)} readOnly disabled className="field-readonly" />
    </div>
  );

  const selectPerito = (
    <SelectField
      label="Asignar perito"
      options={opcionesPeritos}
      placeholder="Selecciona un perito..."
      value={form.perito_id}
      onChange={(e) => update("perito_id", e.target.value)}
    />
  );

  if (esEdicion) {
    return (
      <div>
        {error ? <div className="status-banner error">{error}</div> : null}
        {success ? <div className="status-banner success">{success}</div> : null}

        <form className="card" onSubmit={handleGuardarEdicion}>
          <fieldset disabled={soloLectura} style={{ border: 0, padding: 0, margin: 0 }}>
            {bloqueDatosLlamado}

            <div className="form-grid two-col" style={{ marginBottom: 24 }}>
              <TextField label="Tipo de llamado" value={meta.tipo_llamado} readOnly disabled className="field-readonly" />
            </div>

            <div className="form-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <SelectField
                  label="Nombre de receptor"
                  options={opcionesUsuarios}
                  value={form.receptor_id}
                  onChange={(e) => update("receptor_id", e.target.value)}
                  required
                />
                <TextField
                  label="Nombre de MP"
                  value={form.nombre_ministerio_publico}
                  onChange={(e) => update("nombre_ministerio_publico", e.target.value)}
                  required
                />
                <RadioGroup
                  name="con_detenido"
                  value={form.con_detenido}
                  onChange={(v) => update("con_detenido", v === "true")}
                  options={[
                    { value: true, label: "Con detenido" },
                    { value: false, label: "Sin detenido" },
                  ]}
                />
                <SelectField
                  label="Materia"
                  options={opcionesMaterias}
                  value={form.materia_id}
                  onChange={(e) => update("materia_id", e.target.value)}
                  required
                />
                <SelectField
                  label="Número de carpeta"
                  options={opcionesCarpetas}
                  value={form.numero_carpeta}
                  onChange={(e) => update("numero_carpeta", e.target.value)}
                  required
                />
                {selectPerito}
              </div>

              <TextArea
                label="Descripción de lo que solicita el MP"
                value={form.descripcion_solicitud}
                onChange={(e) => update("descripcion_solicitud", e.target.value)}
                required
              />
            </div>
          </fieldset>

          {!soloLectura && (
            <div className="btn-row end" style={{ marginTop: 24 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div>
      {error ? <div className="status-banner error">{error}</div> : null}
      {success ? <div className="status-banner success">{success}</div> : null}

      <form className="card" onSubmit={handleGuardarNueva}>
        {bloqueDatosLlamado}

        <div className="form-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SelectField
              label="Llamado"
              options={opcionesLlamados}
              value={form.llamado_id}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  llamado_id: e.target.value,
                  materia_id: "",
                  numero_llamado_manual: "",
                  zona_apoyo: "",
                  numero_apoyo: "",
                }))
              }
              required
            />

            {requiereNumeroManual && esApoyo && (
              <div className="form-grid two-col">
                <SelectField
                  label="Zona (libro de apoyo)"
                  options={OPCIONES_ZONA}
                  value={form.zona_apoyo}
                  onChange={(e) => update("zona_apoyo", e.target.value)}
                  required
                />
                <TextField
                  label="Número de apoyo"
                  value={form.numero_apoyo}
                  onChange={(e) => update("numero_apoyo", e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej. 123"
                  required
                />
              </div>
            )}
            {requiereNumeroManual && !esApoyo && (
              <TextField
                label={`Número de llamado (${llamadoSeleccionado.codigo}, captura manual)`}
                value={form.numero_llamado_manual}
                onChange={(e) => update("numero_llamado_manual", e.target.value)}
                placeholder={`Ej. ${llamadoSeleccionado.codigo}001/26`}
                required
              />
            )}

            <SelectField
              label="Nombre de receptor"
              options={opcionesUsuarios}
              value={form.receptor_id}
              onChange={(e) => update("receptor_id", e.target.value)}
              required
            />
            <TextField
              label="Nombre de MP"
              value={form.nombre_ministerio_publico}
              onChange={(e) => update("nombre_ministerio_publico", e.target.value)}
              required
            />
            <RadioGroup
              name="con_detenido"
              value={form.con_detenido}
              onChange={(v) => update("con_detenido", v === "true")}
              options={[
                { value: true, label: "Con detenido" },
                { value: false, label: "Sin detenido" },
              ]}
            />
            <SelectField
              label="Materia"
              options={opcionesMaterias}
              placeholder={form.llamado_id ? "Selecciona..." : "Selecciona primero un llamado"}
              value={form.materia_id}
              onChange={(e) => update("materia_id", e.target.value)}
              disabled={!form.llamado_id}
              required
            />
            <SelectField
              label="Número de carpeta"
              options={opcionesCarpetas}
              value={form.numero_carpeta}
              onChange={(e) => update("numero_carpeta", e.target.value)}
              required
            />
            {selectPerito}
          </div>

          <TextArea
            label="Descripción de lo que solicita el MP"
            value={form.descripcion_solicitud}
            onChange={(e) => update("descripcion_solicitud", e.target.value)}
            required
          />
        </div>

        <div className="btn-row end">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar registro"}
          </button>
        </div>
      </form>
    </div>
  );
}