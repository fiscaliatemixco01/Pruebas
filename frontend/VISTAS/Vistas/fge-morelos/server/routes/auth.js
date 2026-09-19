import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ message: "Usuario y contraseña son obligatorios." });
  }

  const { rows } = await pool.query(
    "select * from usuarios where usuario = $1",
    [usuario]
  );
  const row = rows[0];
  if (!row) return res.status(401).json({ message: "Usuario o contraseña incorrectos." });

  const ok = await bcrypt.compare(contrasena, row.contrasena_hash);
  if (!ok) return res.status(401).json({ message: "Usuario o contraseña incorrectos." });

  req.session.userId = row.id;

  const { contrasena_hash, ...usuarioSinPass } = row;
  res.json(usuarioSinPass);
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "No hay sesión activa." });

  const { rows } = await pool.query("select * from usuarios where id = $1", [req.session.userId]);
  const row = rows[0];
  if (!row) return res.status(401).json({ message: "No hay sesión activa." });

  const { contrasena_hash, ...usuarioSinPass } = row;
  res.json(usuarioSinPass);
});

authRouter.post("/registro", async (req, res) => {
  const { usuario, contrasena, nombre, apellidos, rol, materia } = req.body;
  if (!nombre || !apellidos || !rol) {
    return res.status(400).json({ message: "Nombre, apellidos y rol son obligatorios." });
  }
  if (!usuario || !contrasena) {
    return res.status(400).json({ message: "Usuario y contraseña son obligatorios." });
  }

  const hash = await bcrypt.hash(contrasena, 10);
  try {
    const { rows } = await pool.query(
      `insert into usuarios (usuario, contrasena_hash, nombre, apellidos, rol, materia)
       values ($1, $2, $3, $4, $5, $6)
       returning id, usuario, nombre, apellidos, rol, materia`,
      [usuario, hash, nombre, apellidos, rol, rol === "Perito" ? materia : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Ese usuario ya existe." });
    }
    throw err;
  }
});
