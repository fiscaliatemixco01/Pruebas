BEGIN; 

-- TABLA: materias
-- Catálogo de las especialidades/materias periciales (química, balística,
-- genética, etc.). Sirve para clasificar cada petición según el tipo de
-- peritaje que se solicita.
CREATE TABLE materias (
    id      SERIAL PRIMARY KEY,              -- Identificador autoincremental interno
    nombre  VARCHAR(60) NOT NULL UNIQUE,      -- Nombre de la materia; UNIQUE evita duplicados (ej. no puede haber dos "Balística")
    activo  BOOLEAN NOT NULL DEFAULT TRUE     -- Soft delete: permite "apagar" una materia sin borrarla
                                               -- (evita romper llaves foráneas de peticiones históricas)
);

COMMENT ON TABLE materias IS 'Catálogo de materias/especialidades periciales';

-- Carga inicial del catálogo de materias periciales
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

-- TABLA: llamados
-- Catálogo de tipos de "llamado" (origen/tipo de solicitud). Cada tipo
-- define el PREFIJO que llevará el folio (numero_llamado) generado para
-- las peticiones asociadas a él, y si ese folio se genera de forma
-- automática o se captura manualmente.
CREATE TABLE llamados (
    id            SERIAL PRIMARY KEY,
    codigo        VARCHAR(10) NOT NULL UNIQUE,      -- Prefijo del folio, ej. 'FM', 'FMT', 'SUIP'
    es_automatico BOOLEAN NOT NULL DEFAULT TRUE      -- TRUE = el folio se genera solo (vía trigger);
                                                      -- FALSE = el folio se debe capturar a mano
);

COMMENT ON TABLE llamados IS 'Catálogo de tipos de llamado; define el prefijo del numero_llamado';

-- Carga inicial de tipos de llamado.
-- Nótese que 'FMG' y 'FMAP' son de captura manual (es_automatico = FALSE),
-- el resto se numeran automáticamente.
INSERT INTO llamados (codigo, es_automatico) VALUES
    ('FM',   TRUE),
    ('FMT',  TRUE),
    ('FMM',  TRUE),
    ('FMBA', TRUE),
    ('FMG',  FALSE),
    ('SUIP', TRUE),
    ('FMAP', FALSE);

-- TABLA: contador_llamados
-- Lleva el consecutivo numérico (folio) de cada tipo de llamado, reiniciado
-- cada año. Es la "memoria" que usa el trigger de peticiones para saber
-- cuál es el siguiente número disponible.

CREATE TABLE contador_llamados (
    llamado_id     INTEGER NOT NULL REFERENCES llamados(id), -- A qué tipo de llamado pertenece el contador
    anio           CHAR(2) NOT NULL,                         -- Año en 2 dígitos, ej. '26' para 2026
    ultimo_numero  INTEGER NOT NULL DEFAULT 0,                -- Último consecutivo usado para ese llamado/año
    PRIMARY KEY (llamado_id, anio)
    -- La llave primaria compuesta (llamado_id, anio) garantiza que exista
    -- como máximo UN contador por combinación de tipo de llamado + año,
    -- lo que permite que el conteo se reinicie automáticamente cada año.
);

-- TABLA: peticiones
-- Tabla central del módulo: cada fila representa una solicitud pericial
-- concreta hecha por el Ministerio Público.

CREATE TABLE peticiones (
    id  BIGSERIAL PRIMARY KEY,                     -- Identificador interno de la petición

    llamado_id  INTEGER NOT NULL REFERENCES llamados(id), -- Tipo de llamado asociado (define el prefijo del folio)
    numero_llamado  VARCHAR(30) NOT NULL UNIQUE,
    -- Folio final de la petición (ej. 'FM007/26'). Es UNIQUE porque
    -- identifica de forma pública/oficial a la petición. Este campo se
    -- llena automáticamente por el trigger `trg_generar_numero_llamado`
    -- (o manualmente si el llamado no es automático).

    fecha_recibido  DATE NOT NULL DEFAULT CURRENT_DATE, -- Fecha en que se recibió la solicitud
    hora_recibido   TIME NOT NULL DEFAULT CURRENT_TIME, -- Hora en que se recibió la solicitud
    -- Se separan fecha y hora en dos columnas (en vez de un solo TIMESTAMP)
    -- probablemente para facilitar reportes/filtros que solo necesitan fecha.

    -- --- Llaves foráneas hacia la tabla `usuarios` del Módulo 1 ---
    receptor_id     INTEGER NOT NULL REFERENCES usuarios(id), -- Usuario que recibió/capturó la petición
    nombre_ministerio_publico VARCHAR(150) NOT NULL,          -- Nombre del MP que solicita (texto libre)

    con_detenido  BOOLEAN NOT NULL DEFAULT FALSE, -- Indica si el caso tiene una persona detenida

    materia_id INTEGER NOT NULL REFERENCES materias(id), -- Especialidad pericial requerida
    numero_carpeta  VARCHAR(50) NOT NULL,                -- Número de carpeta de investigación del MP (expediente)
    descripcion_solicitud TEXT NOT NULL,                 -- Detalle de lo que se solicita al perito
    perito_id    INTEGER REFERENCES usuarios(id),        -- Perito asignado (puede ser NULL si aún no se asigna)

    -- Relación biométrica directa con la tabla del Módulo 1
    biom_firma_id  INTEGER REFERENCES biometricos(id) ON DELETE SET NULL,
    -- Firma biométrica asociada a la recepción de la petición.
    -- ON DELETE SET NULL: si el registro biométrico se elimina, la petición
    -- NO se borra en cascada; solo pierde la referencia a esa firma.

    -- --- Banderas de control de entrega de documentos ---
    entrega_dictamen       BOOLEAN NOT NULL DEFAULT FALSE, -- ¿Ya se entregó el dictamen pericial?
    entrega_informe        BOOLEAN NOT NULL DEFAULT FALSE, -- ¿Ya se entregó el informe?
    entrega_requerimiento  BOOLEAN NOT NULL DEFAULT FALSE, -- ¿Ya se entregó/atendió el requerimiento?

    quien_recibe_id        INTEGER REFERENCES usuarios(id) -- Usuario que recibió la entrega de los documentos anteriores
);

-- Índices para acelerar las búsquedas/filtros más comunes sobre peticiones
CREATE INDEX idx_peticiones_materia   ON peticiones(materia_id);     -- Filtrar peticiones por materia pericial
CREATE INDEX idx_peticiones_llamado   ON peticiones(llamado_id);     -- Filtrar peticiones por tipo de llamado
CREATE INDEX idx_peticiones_fecha     ON peticiones(fecha_recibido); -- Filtrar/ordenar por fecha de recepción
CREATE INDEX idx_peticiones_carpeta   ON peticiones(numero_carpeta); -- Buscar peticiones por número de carpeta del MP


-- FUNCIÓN + TRIGGER: generación automática de numero_llamado
-- Objetivo: al insertar una petición, calcular y asignar el folio
-- (numero_llamado) según el tipo de llamado, siguiendo el patrón
-- "PREFIJO + consecutivo con padding de 3 dígitos + / + año(2 dígitos)".
-- Ejemplo de resultado: 'FM007/26'
CREATE OR REPLACE FUNCTION fn_generar_numero_llamado()
RETURNS TRIGGER AS $$
DECLARE
    v_codigo      VARCHAR(10);  -- Prefijo del llamado (ej. 'FM')
    v_automatico  BOOLEAN;      -- Si el llamado genera folio automático o no
    v_anio        CHAR(2);      -- Año actual en 2 dígitos
    v_siguiente   INTEGER;      -- Siguiente número consecutivo calculado
BEGIN
    -- 1) Obtener el código y modalidad (automático/manual) del llamado
    --    que se está usando en el INSERT que disparó este trigger.
    SELECT codigo, es_automatico
      INTO v_codigo, v_automatico
      FROM llamados
     WHERE id = NEW.llamado_id;

    -- 2) Validación defensiva: si el llamado_id no existe en el catálogo,
    --    se aborta la inserción con un mensaje claro.
    --    (En la práctica, la FK de `peticiones.llamado_id` ya impediría
    --    llegar a este punto con un id inválido; esta es una capa extra
    --    de seguridad / mensaje más descriptivo).
    IF v_codigo IS NULL THEN
        RAISE EXCEPTION 'llamado_id % no existe en el catálogo de llamados', NEW.llamado_id;
    END IF;

    -- 3) Año actual en formato de 2 dígitos (ej. '26' para 2026)
    v_anio := to_char(CURRENT_DATE, 'YY');

    IF v_automatico THEN
        -- 4a) CASO AUTOMÁTICO:
        -- Se hace un "UPSERT" sobre contador_llamados:
        --   - Si no existe fila para (llamado_id, anio), se inserta con ultimo_numero = 1.
        --   - Si ya existe, se incrementa ultimo_numero en 1 (ON CONFLICT DO UPDATE).
        -- El uso de ON CONFLICT hace esta operación segura ante inserciones
        -- concurrentes (evita condiciones de carrera / folios duplicados).
        INSERT INTO contador_llamados (llamado_id, anio, ultimo_numero)
        VALUES (NEW.llamado_id, v_anio, 1)
        ON CONFLICT (llamado_id, anio)
        DO UPDATE SET ultimo_numero = contador_llamados.ultimo_numero + 1
        RETURNING ultimo_numero INTO v_siguiente;

        -- Se arma el folio final: PREFIJO + número con 3 dígitos (con ceros
        -- a la izquierda) + '/' + año. Ej: 'FM' + '007' + '/' + '26' = 'FM007/26'
        NEW.numero_llamado := v_codigo || LPAD(v_siguiente::TEXT, 3, '0') || '/' || v_anio;
    ELSE
        -- 4b) CASO MANUAL (es_automatico = FALSE, ej. FMG, FMAP):
        -- No se genera nada automáticamente; se exige que quien inserta
        -- la petición ya haya proporcionado un numero_llamado válido
        -- (no nulo ni vacío/solo espacios).
        IF NEW.numero_llamado IS NULL OR btrim(NEW.numero_llamado) = '' THEN
            RAISE EXCEPTION 'Para el llamado % , numero_llamado debe capturarse manualmente', v_codigo;
        END IF;
    END IF;

    RETURN NEW; -- Se retorna la fila (ya con numero_llamado resuelto) para que continúe el INSERT
END;
$$ LANGUAGE plpgsql;

-- El trigger se ejecuta ANTES de cada INSERT en peticiones (BEFORE INSERT),
-- fila por fila (FOR EACH ROW), para poder modificar NEW.numero_llamado
-- antes de que el registro quede guardado físicamente.
CREATE TRIGGER trg_generar_numero_llamado
    BEFORE INSERT ON peticiones
    FOR EACH ROW
    EXECUTE FUNCTION fn_generar_numero_llamado();

-- VISTA: vw_peticiones
-- Vista de consulta/reporte que "traduce" los ids de las llaves foráneas
-- a valores legibles (nombres), y convierte banderas booleanas en texto
-- descriptivo. Pensada para alimentar pantallas o reportes sin tener que
-- repetir los JOINs en cada consulta.
CREATE OR REPLACE VIEW vw_peticiones AS
SELECT
    p.id,
    p.numero_llamado,
    l.codigo                    AS tipo_llamado,          -- Prefijo del llamado (viene de `llamados`)
    p.fecha_recibido,
    p.hora_recibido,
    u_rec.nombre                AS nombre_receptor,        -- Nombre del usuario que recibió la petición
    p.nombre_ministerio_publico,
    CASE WHEN p.con_detenido THEN 'CON DETENIDO' ELSE 'SIN DETENIDO' END AS estatus_detenido,
    -- Traduce el booleano con_detenido a un texto más claro para reportes
    m.nombre                    AS materia,                -- Nombre de la materia pericial (viene de `materias`)
    p.numero_carpeta,
    p.descripcion_solicitud,
    u_per.nombre                AS nombre_perito,          -- Nombre del perito asignado (puede ser NULL)
    p.entrega_dictamen,
    p.entrega_informe,
    p.entrega_requerimiento,
    u_ent.nombre                AS nombre_quien_recibe     -- Nombre de quien recibió la entrega (puede ser NULL)
FROM peticiones p
JOIN llamados l ON l.id = p.llamado_id      -- INNER JOIN: toda petición debe tener un llamado válido (NOT NULL)
JOIN materias m ON m.id = p.materia_id      -- INNER JOIN: toda petición debe tener una materia válida (NOT NULL)
JOIN usuarios u_rec ON u_rec.id = p.receptor_id -- INNER JOIN: receptor_id es NOT NULL
LEFT JOIN usuarios u_per ON u_per.id = p.perito_id      -- LEFT JOIN: perito_id puede ser NULL (aún sin asignar)
LEFT JOIN usuarios u_ent ON u_ent.id = p.quien_recibe_id; -- LEFT JOIN: quien_recibe_id puede ser NULL (aún sin entrega)


CREATE OR REPLACE VIEW vw_peticiones AS
SELECT
    p.id,
    p.numero_llamado,
    l.codigo AS tipo_llamado,
    p.fecha_recibido,
    p.hora_recibido,
    p.receptor_id,              -- NUEVO
    u_rec.nombre AS nombre_receptor,
    p.nombre_ministerio_publico,
    p.con_detenido,             -- NUEVO (booleano crudo, además del texto)
    CASE WHEN p.con_detenido THEN 'CON DETENIDO' ELSE 'SIN DETENIDO' END AS estatus_detenido,
    p.materia_id,               -- NUEVO
    m.nombre AS materia,
    p.numero_carpeta,
    p.descripcion_solicitud,
    p.llamado_id,               -- NUEVO
    p.perito_id,                -- NUEVO
    u_per.nombre AS nombre_perito,
    p.entrega_dictamen,
    p.entrega_informe,
    p.entrega_requerimiento,
    p.quien_recibe_id,          -- NUEVO
    u_ent.nombre AS nombre_quien_recibe
FROM peticiones p
JOIN llamados l ON l.id = p.llamado_id
JOIN materias m ON m.id = p.materia_id
JOIN usuarios u_rec ON u_rec.id = p.receptor_id
LEFT JOIN usuarios u_per ON u_per.id = p.perito_id
LEFT JOIN usuarios u_ent ON u_ent.id = p.quien_recibe_id;

COMMIT; 