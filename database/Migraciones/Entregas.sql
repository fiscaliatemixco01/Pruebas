-- Una entrega por petición (subir de nuevo la reemplaza)
CREATE TABLE IF NOT EXISTS entregas (
  id             SERIAL PRIMARY KEY,
  peticion_id    INTEGER NOT NULL UNIQUE REFERENCES peticiones(id) ON DELETE CASCADE,
  tipo           TEXT    NOT NULL CHECK (tipo IN ('dictamen', 'informe', 'requerimiento')),
  archivo_nombre TEXT    NOT NULL,
  archivo_ruta   TEXT    NOT NULL,
  subido_por     INTEGER NOT NULL REFERENCES usuarios(id),
  subido_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE usuarios
   SET password_hash = crypt('1234', gen_salt('bf', 10)),
       verificado    = TRUE
 WHERE correo = 'admin@test.com';

-- Comprobar
SELECT id, nombre, correo, rol_id, verificado, password_hash IS NOT NULL AS tiene_password
  FROM usuarios
 WHERE correo = 'admin@test.com';


-- Tabla de notificaciones (una fila por usuario y por aviso)
-- Si usuarios.id / peticiones.id no son INT (por ejemplo BIGINT), ajusta los tipos de us_id y pet_id.
CREATE TABLE IF NOT EXISTS notificaciones (
  id        SERIAL PRIMARY KEY,
  us_id     INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pet_id    INT REFERENCES peticiones(id) ON DELETE CASCADE,
  tipo      VARCHAR(30) NOT NULL,          -- 'asignada' (perito) | 'lista_firma' (admin/receptor)
  mensaje   TEXT NOT NULL,
  leida     BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
  ON notificaciones (us_id, leida, creada_en DESC);