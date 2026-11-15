import { FileLimits, acceptAttribute, formatBytes, validateFiles } from './file-validation';

const limits: FileLimits = { maxSizeBytes: 1024, maxFiles: 2, allowedExtensions: ['png', 'pdf', 'csv', 'txt'] };
const file = (name: string, size = 100, type = '') => new File([new Uint8Array(size)], name, { type });

describe('file validation', () => {
  it('accepts allowed extensions with a matching or unknown MIME type', () => {
    const { accepted, issues } = validateFiles([file('a.png', 10, 'image/png'), file('b.pdf', 10, '')], 0, limits);
    expect(accepted.length).toBe(2);
    expect(issues).toEqual([]);
  });

  it('rejects disallowed extensions, mismatched MIME, empty and oversized files', () => {
    const { accepted, issues } = validateFiles(
      [file('x.exe', 10), file('fake.png', 10, 'application/pdf'), file('empty.txt', 0, 'text/plain'), file('big.pdf', 5000, 'application/pdf')],
      0, limits
    );
    expect(accepted).toEqual([]);
    expect(issues.length).toBe(4);
    expect(issues[0]).toContain('no permitido');
    expect(issues[1]).toContain('no coincide');
    expect(issues[2]).toContain('vacío');
    expect(issues[3]).toContain('supera');
  });

  it('enforces the maximum number of files including already selected ones', () => {
    const { accepted, issues } = validateFiles([file('a.png'), file('b.png'), file('c.png')], 1, limits);
    expect(accepted.length).toBe(1);
    expect(issues.length).toBe(2);
  });

  it('builds the accept attribute and formats sizes', () => {
    expect(acceptAttribute(limits)).toBe('.png,.pdf,.csv,.txt');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
