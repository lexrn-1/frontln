/**
 * Formato PROVISIONAL del código de invitación, tomado del prototipo ("SR-84K2": prefijo SR y 4
 * caracteres alfanuméricos). El plan dice que el ID de sala es de alta entropía y que el ingreso
 * recorta espacios; backend debe confirmar el formato definitivo y bastará cambiar este módulo.
 */
export const ROOM_CODE_PATTERN = /^SR-[A-Z0-9]{4}$/;

/** Recorta espacios, pasa a mayúsculas y añade el guion si falta ("sr84k2" → "SR-84K2"). */
export function normalizeRoomCode(raw: string): string {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  return /^SR[A-Z0-9]{4}$/.test(compact) ? `SR-${compact.slice(2)}` : compact;
}

/** ¿Tiene forma de ID de sala (para rutas `/salas/:id` y `/chats/:roomId`)? No exige el formato del código. */
export function isPlausibleRoomId(id: string): boolean {
  return /^[A-Za-z0-9_-]{3,64}$/.test(id);
}

export function isValidRoomCode(raw: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(raw));
}
