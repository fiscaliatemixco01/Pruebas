// routes/entregas.js
// Se monta en index.js:  app.use('/api/peticiones', verificarToken, entregasRoutes);
// Requiere:  npm install multer  (y ejecutar entregas.sql una vez)

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../db');
const { requerirRol } = require('../middleware/auth');

const router = express.Router();

const ADMIN = 'Administrador';
const PERITO = 'Perito';
const RECEPTOR = 'Receptor';

const TIPOS = ['dictamen', 'informe', 'requerimiento'];
const CARPETA = path.join(__dirname, '..', 'uploads', 'entregas');
fs.mkdirSync(CARPETA, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CARPETA),
    filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}.pdf`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) =>
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('El archivo debe ser un PDF')),
});

// El campo del FormData debe llamarse "archivo"
function subirPdf(req, res, next) {
  upload.single('archivo')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'El PDF supera los 20 MB' : err.message;
    res.status(400).json({ error: msg });
  });
}

// El perito solo puede tocar las peticiones que tiene asignadas.
// Administrador y Receptor pasan. Debe ir DESPUÉS de requerirRol (usa req.usuario.rol).
async function verificarAcceso(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Id de petición inválido' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, perito_id FROM peticiones WHERE id = $1',
      [id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Petición no encontrada' });
    }
    if (req.usuario.rol === PERITO && Number(rows[0].perito_id) !== Number(req.usuario.id)) {
      return res.status(403).json({ error: 'Esta petición no está asignada a ti' });
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al verificar acceso a la petición' });
  }
}

// Detalle de una petición
router.get('/:id', requerirRol(ADMIN, RECEPTOR, PERITO), verificarAcceso, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vw_peticiones WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Petición no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar la petición' });
  }
});

// Datos de la entrega (404 si aún no hay)
router.get('/:id/entrega', requerirRol(ADMIN, RECEPTOR, PERITO), verificarAcceso, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT tipo, archivo_nombre, subido_en FROM entregas WHERE peticion_id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Sin entrega' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar la entrega' });
  }
});

// Subir o reemplazar la entrega
router.post('/:id/entrega', requerirRol(ADMIN, PERITO), verificarAcceso, subirPdf, async (req, res) => {
  const archivo = req.file;
  const tipo = req.body.tipo;

  const descartar = () => archivo && fs.unlink(archivo.path, () => {});

  if (!TIPOS.includes(tipo)) {
    descartar();
    return res.status(400).json({ error: 'Tipo de entrega inválido' });
  }
  if (!archivo) {
    descartar();
    return res.status(400).json({ error: 'Adjunta el PDF de la entrega' });
  }

  try {
    const previa = await pool.query(
      'SELECT archivo_ruta FROM entregas WHERE peticion_id = $1',
      [req.params.id]
    );

    const { rows } = await pool.query(
      `INSERT INTO entregas (peticion_id, tipo, archivo_nombre, archivo_ruta, subido_por, subido_en)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (peticion_id) DO UPDATE
         SET tipo = EXCLUDED.tipo,
             archivo_nombre = EXCLUDED.archivo_nombre,
             archivo_ruta = EXCLUDED.archivo_ruta,
             subido_por = EXCLUDED.subido_por,
             subido_en = NOW()
       RETURNING tipo, archivo_nombre, subido_en`,
      [req.params.id, tipo, archivo.originalname, archivo.filename, req.usuario.id]
    );

    // Borra el PDF anterior si se reemplazó
    if (previa.rows[0]) {
      fs.unlink(path.join(CARPETA, path.basename(previa.rows[0].archivo_ruta)), () => {});
    }

    res.status(201).json(rows[0]);
  } catch (error) {
    descartar();
    console.error(error);
    res.status(500).json({ error: 'Error al guardar la entrega' });
  }
});

// Descargar / ver el PDF
router.get('/:id/entrega/archivo', requerirRol(ADMIN, RECEPTOR, PERITO), verificarAcceso, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT archivo_ruta, archivo_nombre FROM entregas WHERE peticion_id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Sin entrega' });

    const ruta = path.join(CARPETA, path.basename(rows[0].archivo_ruta));
    if (!fs.existsSync(ruta)) return res.status(404).json({ error: 'Archivo no encontrado' });

    res.type('application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(ruta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el archivo' });
  }
});

module.exports = router;