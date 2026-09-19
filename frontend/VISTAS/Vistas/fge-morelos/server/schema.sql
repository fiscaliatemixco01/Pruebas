-- Ejecuta esto una vez contra tu base de datos local, por ejemplo:
--   createdb fge_morelos
--   psql -d fge_morelos -f schema.sql

BEGIN;

-- =========================================================================
-- usuarios (Módulo 1)
-- =========================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id serial PRIMARY KEY,
    usuario text UNIQUE NOT NULL,           -- correo o nombre de usuario para login
    contrasena_hash text NOT NULL,
    nombre text NOT NULL,
    apellidos text NOT NULL,
    rol text NOT NULL,                      -- 'Administrador' | 'Mesa de partes' | 'Perito' | 'Consulta'
    materia text,                           -- solo aplica si rol = 'Perito'
    creado_en timestamptz DEFAULT now()
);

-- =========================================================================
-- biometricos (Módulo 1)
-- NOTA: este proyecto todavía no recibió el esquema definitivo del Módulo 1
-- de biométricos. Se deja aquí una tabla mínima únicamente para que la
-- llave foránea peticiones.biom_firma_id tenga a qué apuntar. Reemplázala
-- por la definición real en cuanto la tengas (columnas, tipo de dato de la
-- firma, etc.) y no deberías tener que tocar nada más de este archivo,
-- porque peticiones solo depende del id.
-- =========================================================================
CREATE TABLE IF NOT EXISTS biometricos (
    id serial PRIMARY KEY,
    usuario_id integer REFERENCES usuarios(id),
    capturado_en timestamptz DEFAULT now()
);

-- =========================================================================
-- materias (catálogo de materias periciales)
-- =========================================================================
CREATE TABLE materias (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL UNIQUE,
    activo  BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE materias IS 'Catálogo de materias/especialidades periciales';

INSERT INTO materias (nombre) VALUES
    ('Odontología forense y social'),
    ('Antropología'),
    ('Incendios y explosivos'),
    ('Traducción'),
    ('Química'),
    ('Genética'),
    ('Balística'),
    ('Psicología'),
    ('Valuación'),
    ('Arquitectura'),
    ('Mecánica'),
    ('Tránsito'),
    ('Criminalística (diversos y homicidios)'),
    ('Lofoscopía'),
    ('Fotografía'),
    ('Informática'),
    ('Grafoscopía'),
    ('Criminalística de laboratorio'),
    ('Zootecnia y Agronomía');

-- =========================================================================
-- llamados (catálogo de tipos de llamado / prefijos)
-- es_automatico = TRUE  -> el numero_llamado lo genera el trigger
-- es_automatico = FALSE -> el usuario lo captura a mano (FMG y FMAP)
-- =========================================================================
CREATE TABLE llamados (
    id            SERIAL PRIMARY KEY,
    codigo        VARCHAR(10) NOT NULL UNIQUE,
    es_automatico BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE llamados IS 'Catálogo de tipos de llamado; define el prefijo del numero_llamado';

INSERT INTO llamados (codigo, es_automatico) VALUES
    ('FM',   TRUE),
    ('FMT',  TRUE),
    ('FMM',  TRUE),
    ('FMBA', TRUE),
    ('FMG',  FALSE),
    ('SUIP', TRUE),
    ('FMAP', FALSE);

-- =========================================================================
-- contador_llamados
-- =========================================================================
CREATE TABLE contador_llamados (
    llamado_id     INTEGER NOT NULL REFERENCES llamados(id),
    anio           CHAR(2) NOT NULL,
    ultimo_numero  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (llamado_id, anio)
);

-- =========================================================================
-- peticiones
-- =========================================================================
CREATE TABLE peticiones (
    id  BIGSERIAL PRIMARY KEY,

    llamado_id  INTEGER NOT NULL REFERENCES llamados(id),
    numero_llamado  VARCHAR(30) NOT NULL UNIQUE,

    fecha_recibido  DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_recibido   TIME NOT NULL DEFAULT CURRENT_TIME,

    -- Llaves foráneas apuntando a la tabla usuarios del Módulo 1
    receptor_id     INTEGER NOT NULL REFERENCES usuarios(id),
    nombre_ministerio_publico VARCHAR(150) NOT NULL,

    con_detenido  BOOLEAN NOT NULL DEFAULT FALSE,

    materia_id INTEGER NOT NULL REFERENCES materias(id),
    numero_carpeta  VARCHAR(50) NOT NULL,
    descripcion_solicitud TEXT NOT NULL,
    perito_id    INTEGER REFERENCES usuarios(id),

    -- Relación biométrica directa con la tabla del Módulo 1
    biom_firma_id  INTEGER REFERENCES biometricos(id) ON DELETE SET NULL,

    entrega_dictamen       BOOLEAN NOT NULL DEFAULT FALSE,
    entrega_informe        BOOLEAN NOT NULL DEFAULT FALSE,
    entrega_requerimiento  BOOLEAN NOT NULL DEFAULT FALSE,

    quien_recibe_id        INTEGER REFERENCES usuarios(id),

    creado_en       timestamptz DEFAULT now(),
    actualizado_en  timestamptz DEFAULT now()
);

CREATE INDEX idx_peticiones_materia   ON peticiones(materia_id);
CREATE INDEX idx_peticiones_llamado   ON peticiones(llamado_id);
CREATE INDEX idx_peticiones_fecha     ON peticiones(fecha_recibido);
CREATE INDEX idx_peticiones_carpeta   ON peticiones(numero_carpeta);

-- Función y Trigger para numero_llamado
CREATE OR REPLACE FUNCTION fn_generar_numero_llamado()
RETURNS TRIGGER AS $$
DECLARE
    v_codigo      VARCHAR(10);
    v_automatico  BOOLEAN;
    v_anio        CHAR(2);
    v_siguiente   INTEGER;
BEGIN
    SELECT codigo, es_automatico
      INTO v_codigo, v_automatico
      FROM llamados
     WHERE id = NEW.llamado_id;

    IF v_codigo IS NULL THEN
        RAISE EXCEPTION 'llamado_id % no existe en el catálogo de llamados', NEW.llamado_id;
    END IF;

    v_anio := to_char(CURRENT_DATE, 'YY');

    IF v_automatico THEN
        INSERT INTO contador_llamados (llamado_id, anio, ultimo_numero)
        VALUES (NEW.llamado_id, v_anio, 1)
        ON CONFLICT (llamado_id, anio)
        DO UPDATE SET ultimo_numero = contador_llamados.ultimo_numero + 1
        RETURNING ultimo_numero INTO v_siguiente;

        NEW.numero_llamado := v_codigo || LPAD(v_siguiente::TEXT, 3, '0') || '/' || v_anio;
    ELSE
        IF NEW.numero_llamado IS NULL OR btrim(NEW.numero_llamado) = '' THEN
            RAISE EXCEPTION 'Para el llamado % , numero_llamado debe capturarse manualmente', v_codigo;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_numero_llamado
    BEFORE INSERT ON peticiones
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_numero_llamado();

-- Trigger simple para mantener actualizado_en al día en cada UPDATE
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_peticiones_actualizado_en
    BEFORE UPDATE ON peticiones
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_timestamp();

-- Vista con JOIN a usuarios, materias y llamados
CREATE OR REPLACE VIEW vw_peticiones AS
SELECT
    p.id,
    p.numero_llamado,
    l.codigo                    AS tipo_llamado,
    p.llamado_id,
    p.fecha_recibido,
    p.hora_recibido,
    p.receptor_id,
    u_rec.nombre || ' ' || u_rec.apellidos AS nombre_receptor,
    p.nombre_ministerio_publico,
    p.con_detenido,
    CASE WHEN p.con_detenido THEN 'CON DETENIDO' ELSE 'SIN DETENIDO' END AS estatus_detenido,
    p.materia_id,
    m.nombre                    AS materia,
    p.numero_carpeta,
    p.descripcion_solicitud,
    p.perito_id,
    u_per.nombre || ' ' || u_per.apellidos AS nombre_perito,
    p.biom_firma_id,
    p.entrega_dictamen,
    p.entrega_informe,
    p.entrega_requerimiento,
    p.quien_recibe_id,
    u_ent.nombre || ' ' || u_ent.apellidos AS nombre_quien_recibe,
    p.creado_en,
    p.actualizado_en
FROM peticiones p
JOIN llamados l ON l.id = p.llamado_id
JOIN materias m ON m.id = p.materia_id
JOIN usuarios u_rec ON u_rec.id = p.receptor_id
LEFT JOIN usuarios u_per ON u_per.id = p.perito_id
LEFT JOIN usuarios u_ent ON u_ent.id = p.quien_recibe_id;

-- =========================================================================
-- bitacora (se conserva; registra cada alta/cambio sobre una petición)
-- =========================================================================
CREATE TABLE IF NOT EXISTS bitacora (
    id serial PRIMARY KEY,
    peticion_id integer REFERENCES peticiones(id),
    numero_llamado text,
    fecha date DEFAULT current_date,
    hora time DEFAULT current_time,
    modificacion text NOT NULL,
    realizado_por text
);

COMMIT;
