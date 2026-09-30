const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

const router = express.Router();
router.use(verificarToken);

const TODOS = ['Administrador', 'Receptor', 'Perito', 'Consulta'];

// ---------- CONFIGURACIÓN DE MULTER (subida de PDF) ----------
const DIR_ENTREGAS = path.join(__dirname, '..', 'uploads', 'entregas');
fs.mkdirSync(DIR_ENTREGAS, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR_ENTREGAS,
    filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}.pdf`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const esPdf =
      file.mimetype === 'application/pdf' &&
      path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(esPdf ? null : new Error('Solo se permiten archivos PDF'), esPdf);
  },
});

const COLUMNA_ENTREGA = {
  dictamen: 'entrega_dictamen',
  informe: 'entrega_informe',
  requerimiento: 'entrega_requerimiento',
};

// ---------- ASIGNADAS AL USUARIO LOGUEADO (debe ir ANTES de /:id) ----------
router.get('/asignadas', requerirRol('Administrador', 'Perito'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT v.*, e.tipo AS entrega_tipo
         FROM vw_peticiones v
         LEFT JOIN entregas e ON e.peticion_id = v.id
        WHERE v.perito_id = $1
        ORDER BY v.fecha_recibido DESC, v.hora_recibido DESC`,
      [req.usuario.id]
    );
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar peticiones asignadas' });
  }
});

// ---------- LISTA (el perito solo ve las suyas) ----------
router.get('/', requerirRol(...TODOS), async (req, res) => {
  const { numero_llamado, perito, fecha, numero_carpeta } = req.query;
  const condiciones = [];
  const params = [];

  if (req.usuario.rol === 'Perito') {
    params.push(req.usuario.id);
    condiciones.push(`perito_id = $${params.length}`);
  }
  if (numero_llamado && numero_llamado.trim()) {
    params.push(`%${numero_llamado.trim()}%`);
    condiciones.push(`numero_llamado ILIKE $${params.length}`);
  }
  if (perito && perito.trim()) {
    params.push(`%${perito.trim()}%`);
    condiciones.push(`nombre_perito ILIKE $${params.length}`);
  }
  if (numero_carpeta && numero_carpeta.trim()) {
    params.push(numero_carpeta.trim());
    condiciones.push(`LOWER(numero_carpeta) = LOWER($${params.length})`);
  }
  if (fecha && fecha.trim()) {
    params.push(fecha.trim());
    condiciones.push(`fecha_recibido = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const r = await pool.query(
      `SELECT * FROM vw_peticiones ${where}
       ORDER BY fecha_recibido DESC, hora_recibido DESC`,
      params
    );
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar peticiones' });
  }
});

// ---------- UNA petición (el perito solo si es suya) ----------
router.get('/:id', requerirRol(...TODOS), async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Id de petición inválido' });

  try {
    const r = await pool.query('SELECT * FROM vw_peticiones WHERE id = $1', [id]);
    const peticion = r.rows[0];
    if (!peticion) return res.status(404).json({ error: 'Petición no encontrada' });

    if (req.usuario.rol === 'Perito' && peticion.perito_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Esta petición no está asignada a ti' });
    }
    res.json(peticion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la petición' });
  }
});

// ---------- CREAR (Administrador y Receptor) ----------
router.post('/', requerirRol('Administrador', 'Receptor'), async (req, res) => {
  const {
    llamado_id,
    nombre_ministerio_publico,
    con_detenido,
    materia_id,
    numero_carpeta,
    descripcion_solicitud,
    numero_llamado,
  } = req.body;

  const receptor_id = req.usuario.id; // sale del token, no del body

  try {
    const ll = await pool.query(
      'SELECT codigo, es_automatico FROM llamados WHERE id = $1',
      [llamado_id]
    );
    if (!ll.rows[0]) return res.status(400).json({ error: 'Llamado no válido' });
    const { codigo, es_automatico } = ll.rows[0];

    // La materia debe corresponder al llamado (si el llamado tiene materias configuradas)
    const ok = await pool.query(
      `SELECT NOT EXISTS (SELECT 1 FROM llamado_materias WHERE llamado_id = $1)
           OR EXISTS (SELECT 1 FROM llamado_materias WHERE llamado_id = $1 AND materia_id = $2)
              AS valido`,
      [llamado_id, materia_id]
    );
    if (!ok.rows[0].valido) {
      return res.status(400).json({ error: `Esa materia no corresponde al llamado ${codigo}` });
    }

    // Número manual (FMG, FMAP): obligatorio; FMAP con formato ZO/123 o JO/123
    let numero = null;
    if (!es_automatico) {
      numero = String(numero_llamado || '').trim().toUpperCase();
      if (!numero) {
        return res.status(400).json({ error: 'El número debe capturarse manualmente' });
      }
      if (codigo === 'FMAP' && !/^(ZO|JO)\/\d+$/.test(numero)) {
        return res.status(400).json({
          error: 'El número de apoyo debe tener el formato ZO/123 o JO/123',
        });
      }
    }

    const resultado = await pool.query(
      `INSERT INTO peticiones
        (llamado_id, receptor_id, nombre_ministerio_publico, con_detenido, materia_id, numero_carpeta, descripcion_solicitud, numero_llamado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        llamado_id,
        receptor_id,
        nombre_ministerio_publico,
        con_detenido,
        materia_id,
        numero_carpeta,
        descripcion_solicitud,
        numero,
      ]
    );

    const nuevaPeticion = resultado.rows[0];

    await pool.query(
      `INSERT INTO bitacora (us_id, acc_id, pet_id, fecha_hora)
       VALUES ($1, 3, $2, NOW())`,
      [receptor_id, nuevaPeticion.id]
    );

    res.status(201).json(nuevaPeticion);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese número ya está registrado, no se puede duplicar' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear la petición' });
  }
});

// ---------- EDITAR / COMPLETAR ----------
// Administrador: todo. Receptor: solo asignar perito / quien recibe en una
// petición suya que todavía no tiene perito (paso 2 de "Nuevo registro").
router.put('/:id', requerirRol('Administrador', 'Receptor'), async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Id de petición inválido' });

  const b = req.body;
  const n = (v) => (v === '' || v === undefined ? null : v);

  try {
    if (req.usuario.rol === 'Receptor') {
      const p = await pool.query(
        'SELECT receptor_id, perito_id FROM peticiones WHERE id = $1',
        [id]
      );
      if (!p.rows[0]) return res.status(404).json({ error: 'Petición no encontrada' });
      if (p.rows[0].receptor_id !== req.usuario.id || p.rows[0].perito_id !== null) {
        return res.status(403).json({ error: 'No tienes permiso para editar esta petición' });
      }

      const r = await pool.query(
        `UPDATE peticiones SET perito_id = $1, quien_recibe_id = $2
          WHERE id = $3 RETURNING *`,
        [n(b.perito_id), n(b.quien_recibe_id), id]
      );
      await pool.query(
        `INSERT INTO bitacora (us_id, acc_id, pet_id) VALUES ($1, 4, $2)`,
        [req.usuario.id, id]
      );
      return res.json(r.rows[0]);
    }

    // Administrador
    const resultado = await pool.query(
      `UPDATE peticiones SET
         receptor_id               = COALESCE($1, receptor_id),
         nombre_ministerio_publico = COALESCE($2, nombre_ministerio_publico),
         con_detenido              = COALESCE($3, con_detenido),
         materia_id                = COALESCE($4, materia_id),
         numero_carpeta            = COALESCE($5, numero_carpeta),
         descripcion_solicitud     = COALESCE($6, descripcion_solicitud),
         perito_id       = CASE WHEN $7  THEN $8  ELSE perito_id END,
         quien_recibe_id = CASE WHEN $9  THEN $10 ELSE quien_recibe_id END,
         entrega_dictamen      = COALESCE($11, entrega_dictamen),
         entrega_informe       = COALESCE($12, entrega_informe),
         entrega_requerimiento = COALESCE($13, entrega_requerimiento)
       WHERE id = $14
       RETURNING *`,
      [
        n(b.receptor_id),
        n(b.nombre_ministerio_publico),
        n(b.con_detenido),
        n(b.materia_id),
        n(b.numero_carpeta),
        n(b.descripcion_solicitud),
        'perito_id' in b, n(b.perito_id),
        'quien_recibe_id' in b, n(b.quien_recibe_id),
        n(b.entrega_dictamen),
        n(b.entrega_informe),
        n(b.entrega_requerimiento),
        id,
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Petición no encontrada' });
    }

    await pool.query(
      `INSERT INTO bitacora (us_id, acc_id, pet_id) VALUES ($1, 4, $2)`,
      [req.usuario.id, id]
    );

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la petición' });
  }
});

// ---------- SUBIR PDF (Administrador o Perito asignado) ----------
router.post(
  '/:id/entrega',
  requerirRol('Administrador', 'Perito'),
  (req, res, next) =>
    upload.single('archivo')(req, res, (err) =>
      err ? res.status(400).json({ error: err.message }) : next()
    ),
  async (req, res) => {
    const { id } = req.params;
    const { tipo } = req.body;
    const borrar = () => req.file && fs.unlink(req.file.path, () => {});

    if (!/^\d+$/.test(id)) { borrar(); return res.status(400).json({ error: 'Id inválido' }); }
    if (!req.file) return res.status(400).json({ error: 'Adjunta un archivo PDF' });
    if (!COLUMNA_ENTREGA[tipo]) { borrar(); return res.status(400).json({ error: 'Tipo de entrega inválido' }); }

    try {
      const p = await pool.query('SELECT perito_id FROM peticiones WHERE id = $1', [id]);
      if (!p.rows[0]) { borrar(); return res.status(404).json({ error: 'Petición no encontrada' }); }

      if (req.usuario.rol === 'Perito' && p.rows[0].perito_id !== req.usuario.id) {
        borrar();
        return res.status(403).json({ error: 'Esta petición no está asignada a ti' });
      }

      const previo = await pool.query('SELECT archivo_ruta FROM entregas WHERE peticion_id = $1', [id]);

      const guardada = await pool.query(
        `INSERT INTO entregas (peticion_id, tipo, archivo_nombre, archivo_ruta, subido_por)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (peticion_id) DO UPDATE
           SET tipo = EXCLUDED.tipo,
               archivo_nombre = EXCLUDED.archivo_nombre,
               archivo_ruta = EXCLUDED.archivo_ruta,
               subido_por = EXCLUDED.subido_por,
               subido_en = NOW()
         RETURNING tipo, archivo_nombre, subido_en`,
        [id, tipo, req.file.originalname, req.file.path, req.usuario.id]
      );

      // Deja marcada solo la casilla del tipo entregado
      await pool.query(
        `UPDATE peticiones
            SET entrega_dictamen = $2, entrega_informe = $3, entrega_requerimiento = $4
          WHERE id = $1`,
        [id, tipo === 'dictamen', tipo === 'informe', tipo === 'requerimiento']
      );

      if (previo.rows[0]?.archivo_ruta) fs.unlink(previo.rows[0].archivo_ruta, () => {});

      res.status(201).json(guardada.rows[0]);
    } catch (error) {
      borrar();
      console.error(error);
      res.status(500).json({ error: 'Error al guardar la entrega' });
    }
  }
);

// ---------- DATOS DE LA ENTREGA (JSON; null si no hay) ----------
router.get('/:id/entrega', requerirRol(...TODOS), async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Id inválido' });

  try {
    const r = await pool.query(
      `SELECT e.tipo, e.archivo_nombre, e.subido_en, p.perito_id
         FROM entregas e JOIN peticiones p ON p.id = e.peticion_id
        WHERE e.peticion_id = $1`,
      [id]
    );
    const e = r.rows[0];
    if (!e) return res.json(null);
    if (req.usuario.rol === 'Perito' && e.perito_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Esta petición no está asignada a ti' });
    }
    res.json({ tipo: e.tipo, archivo_nombre: e.archivo_nombre, subido_en: e.subido_en });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar la entrega' });
  }
});

// ---------- DESCARGAR EL PDF ----------
router.get('/:id/entrega/archivo', requerirRol(...TODOS), async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Id inválido' });

  try {
    const r = await pool.query(
      `SELECT e.archivo_nombre, e.archivo_ruta, p.perito_id
         FROM entregas e JOIN peticiones p ON p.id = e.peticion_id
        WHERE e.peticion_id = $1`,
      [id]
    );
    const e = r.rows[0];
    if (!e) return res.status(404).json({ error: 'Sin PDF cargado' });
    if (req.usuario.rol === 'Perito' && e.perito_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Esta petición no está asignada a ti' });
    }
    res.download(e.archivo_ruta, e.archivo_nombre);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al descargar el archivo' });
  }
});

module.exports = router;