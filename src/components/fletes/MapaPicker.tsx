import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Íconos premium ──
const iconOrigen = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:40px;height:48px">
    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#16a34a;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,0.4);transform:rotate(-45deg)"></div>
    <span style="position:absolute;top:4px;left:5px;font-size:16px">📍</span>
  </div>`,
  iconSize: [40, 48], iconAnchor: [18, 46],
});
const iconDestino = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:40px;height:48px">
    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#dc2626;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,0.4);transform:rotate(-45deg)"></div>
    <span style="position:absolute;top:4px;left:5px;font-size:16px">🏁</span>
  </div>`,
  iconSize: [40, 48], iconAnchor: [18, 46],
});

// ── Types ──
interface LatLng { lat: number; lng: number; }
interface Punto { coords: LatLng; nombre: string; }
interface SearchResult { place_id: number; lat: string; lon: string; display_name: string; }
interface RutaInfo { km: number; duracionMin: number; ruta: [number, number][]; }

// ── Nominatim search (Chile) ──
async function searchLugar(q: string): Promise<SearchResult[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=cl&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    );
    return r.json();
  } catch { return []; }
}

// ── Geocoding inverso ──
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const d = await r.json();
    const a = d.address ?? {};
    return a.city ?? a.town ?? a.village ?? a.county ?? a.state ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
}

// ── OSRM con geometría real de carretera ──
async function calcularRutaOSRM(o: LatLng, d: LatLng): Promise<RutaInfo | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}?overview=full&geometries=geojson`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];
      return {
        km: Math.round(route.distance / 1000),
        duracionMin: Math.round(route.duration / 60),
        ruta: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]),
      };
    }
    return null;
  } catch { return null; }
}

function formatDur(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// ── Auto-fit bounds cuando ambos pins están ──
function BoundsFitter({ o, d }: { o: Punto | null; d: Punto | null }) {
  const map = useMap();
  useEffect(() => {
    if (!o || !d) return;
    const b = L.latLngBounds([o.coords.lat, o.coords.lng], [d.coords.lat, d.coords.lng]);
    map.fitBounds(b, { padding: [55, 55], animate: true, duration: 0.8 });
  }, [o, d, map]);
  return null;
}

// ── Click en el mapa ──
function MapClickHandler({ step, onO, onD }: {
  step: 'origen' | 'destino' | 'done';
  onO: (ll: LatLng) => void;
  onD: (ll: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (step === 'origen') onO({ lat, lng });
      else if (step === 'destino') onD({ lat, lng });
    },
  });
  return null;
}

// ── Buscador con dropdown ──
function SearchBox({ step, onSelect }: {
  step: 'origen' | 'destino' | 'done';
  onSelect: (r: SearchResult) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isOrigen = step === 'origen';

  useEffect(() => {
    if (q.length < 3) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      setResults(await searchLugar(q));
      setLoading(false);
    }, 400);
  }, [q]);

  useEffect(() => { setQ(''); setResults([]); }, [step]);

  if (step === 'done') return null;

  return (
    <div className="relative z-10">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 bg-white shadow-sm transition-colors ${isOrigen ? 'border-green-500' : 'border-red-500'}`}>
        <span>{isOrigen ? '📍' : '🏁'}</span>
        <input
          autoComplete="off"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={isOrigen ? 'Buscar origen en Chile...' : 'Buscar destino en Chile...'}
          className="flex-1 text-sm font-bold text-stone-800 focus:outline-none placeholder:font-normal placeholder:text-stone-400 bg-transparent"
        />
        {loading && <span className="text-xs animate-spin">⏳</span>}
        {q && <button onClick={() => { setQ(''); setResults([]); }} className="text-stone-400 hover:text-stone-700 font-bold leading-none">✕</button>}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-2xl mt-1 overflow-hidden" style={{ zIndex: 9999 }}>
          {results.map(r => (
            <button key={r.place_id}
              onClick={() => { onSelect(r); setQ(''); setResults([]); }}
              className="w-full text-left px-4 py-2.5 text-xs text-stone-700 hover:bg-amber-50 border-b border-stone-100 last:border-0 transition-colors"
            >
              <span className="font-bold">{r.display_name.split(',')[0]}</span>
              <span className="text-stone-400 ml-1">{r.display_name.split(',').slice(1, 3).join(',')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──
interface Props {
  onConfirmar: (origen: string, destino: string, km: number, duracionMin: number) => void;
  onCerrar: () => void;
}

export default function MapaPicker({ onConfirmar, onCerrar }: Props) {
  const [origen, setOrigen] = useState<Punto | null>(null);
  const [destino, setDestino] = useState<Punto | null>(null);
  const [step, setStep] = useState<'origen' | 'destino' | 'done'>('origen');
  const [rutaInfo, setRutaInfo] = useState<RutaInfo | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origen || !destino) return;
    setCalculando(true); setError(null); setRutaInfo(null);
    calcularRutaOSRM(origen.coords, destino.coords).then(info => {
      setCalculando(false);
      if (info) setRutaInfo(info);
      else setError('No se pudo calcular la ruta. Asegúrate de que los puntos estén en Chile.');
    });
  }, [origen, destino]);

  const handleMapOrigen = useCallback(async (c: LatLng) => {
    const n = await reverseGeocode(c.lat, c.lng);
    setOrigen({ coords: c, nombre: n }); setDestino(null); setRutaInfo(null); setError(null); setStep('destino');
  }, []);

  const handleMapDestino = useCallback(async (c: LatLng) => {
    const n = await reverseGeocode(c.lat, c.lng);
    setDestino({ coords: c, nombre: n }); setStep('done');
  }, []);

  const handleSearch = useCallback((r: SearchResult) => {
    const coords: LatLng = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    const nombre = r.display_name.split(',').slice(0, 2).join(',').trim();
    if (step === 'origen') {
      setOrigen({ coords, nombre }); setDestino(null); setRutaInfo(null); setError(null); setStep('destino');
    } else {
      setDestino({ coords, nombre }); setStep('done');
    }
  }, [step]);

  const reiniciar = () => { setOrigen(null); setDestino(null); setRutaInfo(null); setError(null); setStep('origen'); };

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)' }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '96vh' }}>

        {/* Header */}
        <div className="shrink-0 px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1c1917,#292524)' }}>
          <div>
            <p className="font-black text-white text-base">🗺️ Seleccionar ruta en mapa</p>
            <p className="text-stone-400 text-[10px] mt-0.5">OpenStreetMap · Distancia real por carretera (OSRM)</p>
          </div>
          <button onClick={onCerrar} className="w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 hover:text-white transition-all font-bold text-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>✕</button>
        </div>

        {/* Panel info */}
        <div className="shrink-0 bg-stone-50 border-b border-stone-200 px-4 pt-3 pb-3 space-y-2.5">
          {/* Tarjetas origen / destino */}
          <div className="grid grid-cols-2 gap-2">
            {([['origen', origen, '📍', 'border-green-400 bg-green-50'], ['destino', destino, '🏁', 'border-red-400 bg-red-50']] as const).map(([s, punto, emoji, cls]) => (
              <button key={s} onClick={s === 'origen' ? reiniciar : undefined}
                className={`text-left p-2.5 rounded-xl border-2 transition-all ${punto ? cls : step === s ? 'border-amber-400 bg-white shadow' : 'border-dashed border-stone-300 bg-white opacity-60'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-0.5">{emoji} {s}</p>
                <p className={`text-xs font-bold truncate ${punto ? 'text-stone-800' : 'text-stone-400'}`}>{punto?.nombre ?? (step === s ? 'Seleccionando...' : '—')}</p>
              </button>
            ))}
          </div>

          {/* Search box */}
          <SearchBox step={step} onSelect={handleSearch} />

          {/* Instrucción */}
          {step !== 'done' && (
            <p className="text-center text-[10px] text-stone-400 font-bold">
              {step === 'origen' ? '👆 Busca arriba o toca el mapa para fijar el origen' : '👆 Busca arriba o toca el mapa para fijar el destino'}
            </p>
          )}

          {/* Resultado ruta */}
          {(calculando || rutaInfo || error) && (
            <div className={`rounded-2xl px-4 py-3 transition-all ${calculando ? 'bg-blue-50 border border-blue-200' : error ? 'bg-red-50 border border-red-200' : 'shadow-lg'}`}
              style={rutaInfo ? { background: 'linear-gradient(135deg,#b45309,#92400e)' } : {}}>
              {calculando && <p className="text-blue-700 text-sm font-bold flex items-center gap-2"><span className="animate-spin">⏳</span>Calculando ruta real por carretera...</p>}
              {error && <p className="text-red-600 text-sm font-bold">⚠️ {error}</p>}
              {rutaInfo && (
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-amber-200 text-[10px] font-bold uppercase tracking-wide">Distancia por carretera</p>
                    <p className="font-black text-3xl text-white leading-none">{rutaInfo.km} <span className="text-lg font-bold text-amber-300">km</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-200 text-[10px] font-bold uppercase tracking-wide">Tiempo estimado</p>
                    <p className="font-black text-xl text-amber-200">~{formatDur(rutaInfo.duracionMin)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1" style={{ minHeight: '260px' }}>
          <MapContainer center={[-35.5, -71.0]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler step={step} onO={handleMapOrigen} onD={handleMapDestino} />
            <BoundsFitter o={origen} d={destino} />
            {origen && <Marker position={[origen.coords.lat, origen.coords.lng]} icon={iconOrigen} />}
            {destino && <Marker position={[destino.coords.lat, destino.coords.lng]} icon={iconDestino} />}
            {/* Ruta real por carretera */}
            {rutaInfo && <Polyline positions={rutaInfo.ruta} color="#b45309" weight={5} opacity={0.85} />}
            {/* Línea guía mientras se calcula */}
            {origen && destino && !rutaInfo && (
              <Polyline positions={[[origen.coords.lat, origen.coords.lng], [destino.coords.lat, destino.coords.lng]]} color="#94a3b8" weight={2} dashArray="8,6" opacity={0.5} />
            )}
          </MapContainer>
        </div>

        {/* Acciones */}
        <div className="shrink-0 p-4 border-t border-stone-200 flex gap-2 bg-white">
          <button onClick={reiniciar} className="px-5 py-3.5 rounded-2xl font-bold text-sm border-2 border-stone-200 text-stone-600 hover:bg-stone-100 transition-all flex items-center gap-1.5">
            ↻ Reiniciar
          </button>
          <button
            onClick={() => origen && destino && rutaInfo && onConfirmar(origen.nombre, destino.nombre, rutaInfo.km, rutaInfo.duracionMin)}
            disabled={!(origen && destino && rutaInfo && !calculando)}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#b45309,#92400e)' }}
          >
            ✓ Confirmar ruta
          </button>
        </div>
      </div>
    </div>
  );
}
