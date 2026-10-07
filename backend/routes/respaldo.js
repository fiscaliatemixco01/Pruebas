const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const pool = require('../db');
const { verificarToken, requerirRol } = require('../middleware/auth');

// archiver 7 o anterior exporta una función; las versiones nuevas exportan la clase ZipArchive
const crearZip = (opciones) =>
  typeof archiver === 'function' ? archiver('zip', opciones) : new archiver.ZipArchive(opciones);

const router = express.Router();
router.use(verificarToken);

// Misma carpeta donde routes/peticiones.js guarda los PDF de entrega
const DIR_ENTREGAS = path.join(__dirname, '..', 'uploads', 'entregas');

// ---------- RESPALDO COMPLETO (.zip): datos de todas las tablas + PDF de entregas ----------
router.get('/', requerirRol('Administrador'), async (req, res) => {
  try {
    // Todas las tablas del esquema public (las vistas no se respaldan: se arman con las tablas)
    const t = await pool.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name`
    );

    // Se lee todo ANTES de empezar a responder: si algo falla, el usuario recibe un error normal
    const tablas = [];
    for (const { table_name } of t.rows) {
      const r = await pool.query(`SELECT * FROM "${table_name.replace(/"/g, '""')}"`);
      tablas.push({ nombre: table_name, filas: r.rows });
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="respaldo-${fecha}.zip"`);

    const zip = crearZip({ zlib: { level: 9 } });
    zip.on('error', (err) => {
      console.error('Error al armar el respaldo:', err);
      res.destroy(err);
    });
    zip.pipe(res);

    const hayEntregas = fs.existsSync(DIR_ENTREGAS);

    const leeme = [
      'RESPALDO DEL SISTEMA',
      `Generado: ${ahora.toISOString()}`,
      `Generado por el usuario con id ${req.usuario.id}`,
      '',
      'Contenido:',
      '  base_de_datos/  Un archivo .json por cada tabla, con todos sus registros.',
      '  entregas/       PDF cargados por los peritos (carpeta uploads/entregas).',
      '',
      'Tablas respaldadas:',
      ...tablas.map((x) => `  ${x.nombre}: ${x.filas.length} registros`),
      '',
      'Notas:',
      '  - La tabla usuarios incluye las contraseñas cifradas (hash). Guarda este archivo en un lugar seguro.',
      '  - En la tabla entregas, archivo_ruta guarda la ruta del servidor donde estaba cada PDF;',
      '    si restauras en otro equipo, esa ruta se debe ajustar a la nueva ubicación de la carpeta entregas.',
      hayEntregas ? '' : '  - No se encontró la carpeta uploads/entregas, por eso este respaldo no incluye PDF.',
    ].join('\n');

    zip.append(leeme, { name: 'LEEME.txt' });
    for (const x of tablas) {
      zip.append(JSON.stringify(x.filas, null, 2), { name: `base_de_datos/${x.nombre}.json` });
    }
    if (hayEntregas) zip.directory(DIR_ENTREGAS, 'entregas');

    await zip.finalize();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar el respaldo' });
  }
});

module.exports = router;