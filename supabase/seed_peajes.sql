-- ============================================================
-- SEED: peajes_chile
-- Tarifas TAG aproximadas 2025. Fuente: autopistas.cl / MOP
-- Actualiza los valores de tarifa_liviano / tarifa_camion
-- desde la sección Administración → Peajes de la app.
-- ============================================================

-- Limpiar datos anteriores (opcional — comenta si quieres conservar)
-- TRUNCATE TABLE peajes_chile;

INSERT INTO peajes_chile (id, nombre, ruta, tramo_origen, tramo_destino, orden, tarifa_liviano, tarifa_camion)
VALUES

-- ── Ruta 5 Sur (Santiago ↔ Puerto Montt) ──────────────────────────
  (gen_random_uuid(), 'Angostura (Paine)',     'Ruta 5', 'Santiago',     'Rancagua',      10, 2900, 6500),
  (gen_random_uuid(), 'Chada (Rancagua Sur)',  'Ruta 5', 'Rancagua',     'San Fernando',  20, 2900, 6500),
  (gen_random_uuid(), 'San Fernando',          'Ruta 5', 'San Fernando', 'Curicó',        30, 2900, 6500),
  (gen_random_uuid(), 'Curicó',                'Ruta 5', 'Curicó',       'Talca',         40, 2900, 6500),
  (gen_random_uuid(), 'Talca',                 'Ruta 5', 'Talca',        'Linares',       50, 2900, 6500),
  (gen_random_uuid(), 'Chillán',               'Ruta 5', 'Linares',      'Chillán',       60, 2900, 6500),
  (gen_random_uuid(), 'Los Ángeles',           'Ruta 5', 'Chillán',      'Los Ángeles',   70, 2900, 6500),
  (gen_random_uuid(), 'Collipulli',            'Ruta 5', 'Los Ángeles',  'Collipulli',    80, 2900, 6500),
  (gen_random_uuid(), 'Temuco',                'Ruta 5', 'Collipulli',   'Temuco',        90, 2900, 6500),
  (gen_random_uuid(), 'Freire',                'Ruta 5', 'Temuco',       'Freire',       100, 2900, 6500),
  (gen_random_uuid(), 'Valdivia',              'Ruta 5', 'Freire',       'Valdivia',     110, 2900, 6500),
  (gen_random_uuid(), 'Osorno',                'Ruta 5', 'Valdivia',     'Osorno',       120, 2900, 6500),
  (gen_random_uuid(), 'Puerto Montt',          'Ruta 5', 'Osorno',       'Puerto Montt', 130, 2900, 6500),

-- ── Ruta 68 (Santiago ↔ Valparaíso / Viña del Mar) ───────────────
  (gen_random_uuid(), 'Lo Prado',              'Ruta 68', 'Santiago',    'Casablanca',    10, 2100, 5800),
  (gen_random_uuid(), 'Zapata',                'Ruta 68', 'Casablanca',  'Valparaíso',    20, 2100, 5800),

-- ── Ruta 66 (Rancagua / San Fernando ↔ Casablanca) ───────────────
  (gen_random_uuid(), 'Rancagua Sur',          'Ruta 66', 'Rancagua',    'Casablanca',    10, 2500, 5500),

-- ── Ruta 78 (Santiago ↔ San Antonio) ─────────────────────────────
  (gen_random_uuid(), 'San Antonio',           'Ruta 78', 'Santiago',    'San Antonio',   10, 2200, 5500),

-- ── Ruta 60 (Santiago ↔ Los Andes) ───────────────────────────────
  (gen_random_uuid(), 'Los Andes',             'Ruta 60', 'Santiago',    'Los Andes',     10, 2000, 5000),

-- ── Ruta 5 Norte (Santiago ↔ La Serena / Copiapó) ────────────────
  (gen_random_uuid(), 'Lampa Norte',           'Ruta 5N', 'Santiago',    'La Ligua',      10, 2900, 6500),
  (gen_random_uuid(), 'La Ligua',              'Ruta 5N', 'La Ligua',    'Los Vilos',     20, 2900, 6500),
  (gen_random_uuid(), 'Los Vilos',             'Ruta 5N', 'Los Vilos',   'La Serena',     30, 2900, 6500),
  (gen_random_uuid(), 'La Serena',             'Ruta 5N', 'La Serena',   'Copiapó',       40, 2900, 6500)

ON CONFLICT DO NOTHING;
