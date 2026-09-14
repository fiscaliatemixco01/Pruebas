const express = require('express');
const pool = require('./db');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

app.get('/usuarios', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM usuarios');
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});