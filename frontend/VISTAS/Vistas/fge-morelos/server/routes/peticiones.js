import { Router } from "express";
import { pool } from "../db.js";

export const peticionesRouter = Router();
export const catalogosRouter = Router();

async function registrarBitacora(client, { peticion_id, numero_llamado, modificacion, realizado_por }) {
  await client.query(
    `insert into bitacora (peticion_id, numero_llamado, modificacion, realizado_por)
     values ($1, $2, $3, $4)`,
    [peticion_id, numero_llamado, modificacion, realizado_por || "Sistema"]
  );
}

function usuarioActual(req) {
  return req.session?.userId ? String(req.session.userId) : "Sistema";
}

// Campos que sí se pueden tocar en una edición.
// fecha_recibido, hora_recibido, numero_llamado y llamado_id quedan
// bloqueados a propósito: el número de llamado (y el tipo que le dio
// origen) no se puede modificar una vez generado.
const CAMPOS_EDITABLES = [
  "receptor_id",
  "nombre_ministerio_publico",
  "con_detenido",
  "materia_id",
  "numero_carpeta",
  "descripcion_solicitud",
  "perito_id",
  "biom_firma_id",
  "entrega_dictamen",
  "entrega_informe",
  "entrega_requerimiento",
  "quien_recibe_id",
];

// Paso 1: crear la petición
peticionesRouter.post("/", async (req, res) => {
  const {
    llamado_id,
    numero_llamado, // solo se usa si el llamado es manual (FMG / FMAP)
    receptor_id,
    nombre_ministerio_publico,
    con_detenido,
    materia_id,
    numero_carpeta,
    descripcion_solicitud,
  } = req.body;

  if (!llamado_id || !receptor_id || !nombre_ministerio_publico || !materia_id || !numero_carpeta || !descripcion_solicitud) {
    return res.status(400).json({
      message:
        "Llamado, receptor, nombre del MP, materia, número de carpeta y descripción son obligatorios.",
    });
  }

  const client = await pool.connect();
  try {
    // Averiguamos si este tipo de llamado es automático o manual (FMG/FMAP)
    const { rows: llamadoRows } = await client.query(
      "select codigo, es_automatico from llamados where id = $1",
      [llamado_id]
    );
    const llamado = llamadoRows[0];
    if (!llamado) {
      return res.status(400).json({ message: "El tipo de llamado no existe." });
    }
    if (!llamado.es_automatico && (!numero_llamado || !numero_llamado.trim())) {
      return res.status(400).json({
        message: `Para el llamado ${llamado.codigo} debes capturar el número de llamado manualmente.`,
      });
    }

    await client.query("begin");

    // Si es automático, mandamos NULL: el trigger de la BD lo genera.
    // Si es manual (FMG/FMAP), mandamos el valor que capturó el usuario.
    const { rows } = await client.query(
      `insert into peticiones
        (llamado_id, numero_llamado, receptor_id, nombre_ministerio_publico,
         con_detenido, materia_id, numero_carpeta, descripcion_solicitud)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        llamado_id,
        llamado.es_automatico ? null : numero_llamado.trim(),
        receptor_id,
        nombre_ministerio_publico,
        Boolean(con_detenido),
        materia_id,
        numero_carpeta,
        descripcion_solicitud,
      ]
    );
    const peticion = rows[0];
    await registrarBitacora(client, {
      peticion_id: peticion.id,
      numero_llamado: peticion.numero_llamado,
      modificacion: "Registro creado",
      realizado_por: usuarioActual(req),
    });
    await client.query("commit");
    res.status(201).json(peticion);
  } catch (err) {
    await client.query("rollback");
    if (err.code === "23505") {
      return res.status(409).json({ message: "Ya existe una petición con ese número de llamado." });
    }
    throw err;
  } finally {
    client.release();
  }
});

// Paso 2 (o edición general): actualizar cualquier subconjunto de campos editables
peticionesRouter.put("/:id", async (req, res) => {
  const { id } = req.params;

  // Si el cliente intenta mandar un campo bloqueado, lo ignoramos en
  // silencio (no rompemos la petición), solo nunca entra al UPDATE.
  const sets = [];
  const values = [];
  CAMPOS_EDITABLES.forEach((campo) => {
    if (campo in req.body) {
      values.push(req.body[campo]);
      sets.push(`${campo} = $${values.length}`);
    }
  });

  if (sets.length === 0) {
    return res.status(400).json({ message: "No se envió ningún campo editable para actualizar." });
  }

  values.push(id);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `update peticiones set ${sets.join(", ")}
       where id = $${values.length}
       returning *`,
      values
    );
    if (!rows[0]) {
      await client.query("rollback");
      return res.status(404).json({ message: "Petición no encontrada." });
    }
    await registrarBitacora(client, {
      peticion_id: rows[0].id,
      numero_llamado: rows[0].numero_llamado,
      modificacion: `Actualizado: ${Object.keys(req.body).filter((c) => CAMPOS_EDITABLES.includes(c)).join(", ")}`,
      realizado_por: usuarioActual(req),
    });
    await client.query("commit");
    res.json(rows[0]);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
});

// Catálogos: se montan en index.js como /api/peritos, /api/materias y
// /api/llamados (rutas de nivel superior), porque así los consume
// src/api/peticiones.js en el frontend.
catalogosRouter.get("/peritos", async (req, res) => {
  const { rows } = await pool.query(
    "select id, nombre, apellidos from usuarios where rol = 'Perito' order by nombre"
  );
  res.json(rows.map((r) => ({ id: r.id, nombre: `${r.nombre} ${r.apellidos}` })));
});

catalogosRouter.get("/materias", async (req, res) => {
  const { rows } = await pool.query(
    "select id, nombre from materias where activo = true order by nombre"
  );
  res.json(rows);
});

// Catálogo de tipos de llamado, con la bandera es_automatico para que el
// frontend sepa cuándo pedir el número de llamado a mano (FMG y FMAP).
catalogosRouter.get("/llamados", async (req, res) => {
  const { rows } = await pool.query(
    "select id, codigo, es_automatico from llamados order by codigo"
  );
  res.json(rows);
});

peticionesRouter.get("/:id", async (req, res) => {
  const { rows } = await pool.query("select * from vw_peticiones where id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Petición no encontrada." });
  res.json(rows[0]);
});

peticionesRouter.get("/", async (req, res) => {
  const { numero_llamado, perito, fecha } = req.query;
  const clauses = [];
  const values = [];

  if (numero_llamado) {
    values.push(`%${numero_llamado}%`);
    clauses.push(`numero_llamado ilike $${values.length}`);
  }
  if (perito) {
    values.push(`%${perito}%`);
    clauses.push(`nombre_perito ilike $${values.length}`);
  }
  if (fecha) {
    values.push(fecha);
    clauses.push(`fecha_recibido = $${values.length}`);
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const { rows } = await pool.query(
    `select * from vw_peticiones ${where} order by creado_en desc limit 100`,
    values
  );
  res.json(rows);
});
