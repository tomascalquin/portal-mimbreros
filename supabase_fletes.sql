-- ══════════════════════════════════════════════════════════════
-- COTIZADOR DE FLETES — TABLAS + SEED
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ══════════════════════════════════════════════════════════════

-- 1. Vehículos de flete
CREATE TABLE IF NOT EXISTS vehiculos_flete (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tienda_id uuid REFERENCES tiendas(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'camioneta',
  rendimiento_km_lt numeric NOT NULL DEFAULT 10,
  precio_litro numeric NOT NULL DEFAULT 1550,
  costo_desgaste_km numeric NOT NULL DEFAULT 25,
  velocidad_promedio numeric NOT NULL DEFAULT 80,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehiculos_flete ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuarios_vehiculos" ON vehiculos_flete;
CREATE POLICY "usuarios_vehiculos" ON vehiculos_flete
  FOR ALL USING (tienda_id = auth.uid())
  WITH CHECK (tienda_id = auth.uid());

-- 2. Peajes de Chile (tabla pública de referencia)
CREATE TABLE IF NOT EXISTS peajes_chile (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  ruta text NOT NULL,
  tramo_origen text NOT NULL,
  tramo_destino text NOT NULL,
  tarifa_liviano numeric NOT NULL,
  tarifa_camion numeric,
  orden integer DEFAULT 0
);

-- Sin RLS: data pública de solo lectura
ALTER TABLE peajes_chile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "peajes_lectura_publica" ON peajes_chile;
CREATE POLICY "peajes_lectura_publica" ON peajes_chile
  FOR SELECT USING (true);

-- Asegurar columna orden (por si la tabla ya existía sin ella)
ALTER TABLE peajes_chile ADD COLUMN IF NOT EXISTS orden integer DEFAULT 0;

-- 3. Cotizaciones guardadas
CREATE TABLE IF NOT EXISTS cotizaciones_flete (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tienda_id uuid REFERENCES tiendas(id) ON DELETE CASCADE NOT NULL,
  vehiculo_id uuid REFERENCES vehiculos_flete(id) ON DELETE SET NULL,
  vehiculo_nombre text,
  cliente_nombre text,
  origen text NOT NULL,
  destino text NOT NULL,
  distancia_km numeric NOT NULL,
  ida_y_vuelta boolean DEFAULT false,
  costo_combustible numeric,
  costo_desgaste numeric,
  costo_peajes numeric,
  costo_conductor numeric,
  costo_almuerzo numeric,
  horas_conductor numeric,
  valor_hora_conductor numeric,
  valor_almuerzo numeric,
  margen_pct numeric DEFAULT 0,
  costo_total numeric,
  precio_final numeric,
  nota text,
  peajes_detalle jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cotizaciones_flete ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuarios_cotizaciones" ON cotizaciones_flete;
CREATE POLICY "usuarios_cotizaciones" ON cotizaciones_flete
  FOR ALL USING (tienda_id = auth.uid())
  WITH CHECK (tienda_id = auth.uid());

-- ══════════════════════════════════════════════════════════════
-- SEED: Peajes de Chile 2026
-- ══════════════════════════════════════════════════════════════

-- Limpiar peajes existentes
DELETE FROM peajes_chile;

-- ── Ruta 5 Sur ──
INSERT INTO peajes_chile (nombre, ruta, tramo_origen, tramo_destino, tarifa_liviano, tarifa_camion, orden) VALUES
  ('Acceso Sur Santiago',   'ruta5_sur', 'Santiago',    'Rancagua',    1400, 2500, 1),
  ('Angostura (Troncal)',   'ruta5_sur', 'Santiago',    'Rancagua',    3800, 6900, 2),
  ('Pelequén',              'ruta5_sur', 'Rancagua',    'San Fernando', 900, 1600, 3),
  ('Quinta (Troncal)',      'ruta5_sur', 'San Fernando','Curicó',      3800, 6900, 4),
  ('Curicó - Talca',        'ruta5_sur', 'Curicó',     'Talca',        900, 1600, 5),
  ('Maule (Troncal)',       'ruta5_sur', 'Talca',      'Linares',     3300, 5600, 6),
  ('Linares - Chillán',     'ruta5_sur', 'Linares',    'Chillán',     3300, 5600, 7),
  ('Chillán - Los Ángeles', 'ruta5_sur', 'Chillán',    'Los Ángeles', 3400, 6100, 8),
  ('Los Ángeles - Collipulli','ruta5_sur','Los Ángeles','Collipulli',  3400, 6100, 9),
  ('Collipulli - Temuco',   'ruta5_sur', 'Collipulli', 'Temuco',      3600, 6400, 10),
  ('Temuco - Freire',       'ruta5_sur', 'Temuco',     'Freire',      2800, 5000, 11),
  ('Freire - Valdivia',     'ruta5_sur', 'Freire',     'Valdivia',    2800, 5000, 12),
  ('Valdivia - Osorno',     'ruta5_sur', 'Valdivia',   'Osorno',      2600, 4700, 13),
  ('Osorno - Puerto Montt', 'ruta5_sur', 'Osorno',     'Puerto Montt',2600, 4700, 14);

-- ── Ruta 68 (Santiago - Valparaíso) ──
INSERT INTO peajes_chile (nombre, ruta, tramo_origen, tramo_destino, tarifa_liviano, tarifa_camion, orden) VALUES
  ('Lo Prado',  'ruta68', 'Santiago',    'Casablanca',  2700, 4800, 1),
  ('Zapata',    'ruta68', 'Casablanca',  'Valparaíso',  2700, 4800, 2);

-- ── Ruta 78 (Santiago - San Antonio) ──
INSERT INTO peajes_chile (nombre, ruta, tramo_origen, tramo_destino, tarifa_liviano, tarifa_camion, orden) VALUES
  ('Pórticos Ruta 78', 'ruta78', 'Santiago', 'San Antonio', 2400, 4300, 1);

-- ── Ruta 5 Norte ──
INSERT INTO peajes_chile (nombre, ruta, tramo_origen, tramo_destino, tarifa_liviano, tarifa_camion, orden) VALUES
  ('Lampa',         'ruta5_norte', 'Santiago',     'Los Andes',    1800, 3200, 1),
  ('Las Vegas',     'ruta5_norte', 'Los Andes',    'La Ligua',     2600, 4700, 2),
  ('Pichidangui',   'ruta5_norte', 'La Ligua',     'Los Vilos',    2200, 4000, 3),
  ('Los Vilos',     'ruta5_norte', 'Los Vilos',    'La Serena',    3000, 5400, 4),
  ('La Serena',     'ruta5_norte', 'La Serena',    'Copiapó',      3200, 5800, 5);
