import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";

import { authRouter } from "./routes/auth.js";
import { peticionesRouter, catalogosRouter } from "./routes/peticiones.js";
import { bitacoraRouter } from "./routes/bitacora.js";
import { usuariosRouter } from "./routes/usuarios.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cambia-esto-en-produccion",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // pon esto en true cuando sirvas todo por https
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

app.use("/api/auth", authRouter);
app.use("/api/peticiones", peticionesRouter);
app.use("/api/bitacora", bitacoraRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api", catalogosRouter); // expone /api/peritos y /api/materias

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Manejador de errores simple para que cualquier throw de las rutas
// regrese JSON en vez de tumbar el servidor.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
