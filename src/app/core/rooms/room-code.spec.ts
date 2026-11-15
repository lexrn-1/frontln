import { isValidRoomCode, normalizeRoomCode } from './room-code';

describe('room code', () => {
  it('trims spaces, uppercases and restores the hyphen', () => {
    expect(normalizeRoomCode('  sr84k2 ')).toBe('SR-84K2');
    expect(normalizeRoomCode('sr-84k2')).toBe('SR-84K2');
  });

  it('accepts the prototype format and rejects other shapes', () => {
    expect(isValidRoomCode('SR-84K2')).toBeTrue();
    expect(isValidRoomCode(' sr 84k2 ')).toBeTrue();
    expect(isValidRoomCode('')).toBeFalse();
    expect(isValidRoomCode('84K2')).toBeFalse();
    expect(isValidRoomCode('SR-84K')).toBeFalse();
    expect(isValidRoomCode('SR-84K2X')).toBeFalse();
  });
});
