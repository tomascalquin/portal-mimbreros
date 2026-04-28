// ─── Utilidades de fecha y formato ──────────────────────────────────────────

export const formatCLP = (n: number) => `$${n.toLocaleString('es-CL')}`;

// Zona horaria: siempre America/Santiago
export const TZ = 'America/Santiago';

const _fmtFecha = new Intl.DateTimeFormat('en', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
});

export const fechaEnSantiago = (dateOrIso: Date | string): string => {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const parts = _fmtFecha.formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export const hoyEnSantiago = (): string => fechaEnSantiago(new Date());

export const lunesDe = (fechaStr: string): string => {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const dia = fecha.getUTCDay();
  const diffLunes = dia === 0 ? -6 : 1 - dia;
  fecha.setUTCDate(fecha.getUTCDate() + diffLunes);
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
};

export const sumarDias = (fechaStr: string, dias: number): string => {
  const [y, m, d] = fechaStr.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d + dias));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
};

export const calcularSemana = (offsetSemanas: number) => {
  const hoyStr = hoyEnSantiago();
  const lunesStr = sumarDias(lunesDe(hoyStr), offsetSemanas * 7);
  const domingoStr = sumarDias(lunesStr, 6);
  const proximoLunesStr = sumarDias(lunesStr, 7);

  const [ly, lm, ld] = lunesStr.split('-').map(Number);
  const [dy, dm, dd] = domingoStr.split('-').map(Number);
  const inicio = new Date(ly, lm - 1, ld);
  const fin = new Date(dy, dm - 1, dd, 23, 59, 59);

  return { inicio, fin, lunesStr, domingoStr, proximoLunesStr };
};

export const esDeSemana = (iso: string, offsetSemanas: number): boolean => {
  const fechaStr = fechaEnSantiago(iso);
  const { lunesStr, proximoLunesStr } = calcularSemana(offsetSemanas);
  return fechaStr >= lunesStr && fechaStr < proximoLunesStr;
};

const _fmtDisplay = new Intl.DateTimeFormat('es-CL', {
  timeZone: TZ,
  weekday: 'short', day: 'numeric', month: 'short',
});

export const formatFecha = (iso: string) => {
  let d: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, day] = iso.split('-').map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    d = new Date(iso);
  }
  return _fmtDisplay.format(d);
};
