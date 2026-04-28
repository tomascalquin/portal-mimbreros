import type { OrigenProducto } from '../types';

export const BADGE: Record<OrigenProducto | 'manual', { label: string; cls: string }> = {
  vitrina: { label: 'Vitrina',  cls: 'bg-blue-50 text-blue-600' },
  compras: { label: 'Compras',  cls: 'bg-amber-50 text-amber-700' },
  manual:  { label: 'Manual',   cls: 'bg-stone-100 text-stone-500' },
};
