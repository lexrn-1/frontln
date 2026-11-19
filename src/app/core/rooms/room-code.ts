/** El ID público es un UUID v4. Solo se recortan espacios en los extremos. */
export const ROOM_CODE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeRoomCode(raw: string): string {
  return raw.trim().toLowerCase();
}
export function isPlausibleRoomId(id: string): boolean {
  return ROOM_CODE_PATTERN.test(id);
}
export function isValidRoomCode(raw: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(raw));
}
