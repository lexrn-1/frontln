import { isValidRoomCode, normalizeRoomCode, isPlausibleRoomId } from './room-code';
describe('Room UUID contract', () => {
  const id = '40b4c52b-ab39-4f52-a897-322a175eaa97';
  it('trims ends and accepts uppercase pasted UUIDs', () => {
    expect(normalizeRoomCode(' ' + id.toUpperCase() + ' ')).toBe(id);
    expect(isValidRoomCode(' ' + id + ' ')).toBeTrue();
  });
  it('rejects prototype IDs, inner whitespace and wrong UUID versions', () => {
    for (const bad of ['', 'SR-84K2', id.replace('ab39', 'ab 39'), id.replace('-4f52', '-1f52')])
      expect(isValidRoomCode(bad)).toBeFalse();
    expect(isPlausibleRoomId(id)).toBeTrue();
  });
});
