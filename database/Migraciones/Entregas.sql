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