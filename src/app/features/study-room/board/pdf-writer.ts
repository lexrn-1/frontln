export interface PdfImage {
  /** Bytes de una imagen JPEG. */
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/**
 * Genera un PDF mínimo (una imagen JPEG por página) sin dependencias. Cada página mide `pageWidth`
 * puntos de ancho y conserva la proporción de la imagen, por lo que colores, trazos y textos se
 * ven tal cual en el tablero.
 */
export function buildPdf(images: readonly PdfImage[], pageWidth = 842): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;
  const push = (data: Uint8Array | string): void => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    offset += bytes.length;
  };
  const startObject = (num: number): void => {
    offsets[num] = offset;
    push(`${num} 0 obj\n`);
  };

  push('%PDF-1.4\n');
  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  push(`<< /Type /Pages /Kids [${images.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] /Count ${images.length} >>\nendobj\n`);

  images.forEach((img, i) => {
    const page = 3 + 3 * i, content = 4 + 3 * i, image = 5 + 3 * i;
    const w = pageWidth;
    const h = Math.round(((pageWidth * img.height) / img.width) * 100) / 100;
    startObject(page);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>\nendobj\n`);
    const stream = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    startObject(content);
    push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    startObject(image);
    push(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`);
    push(img.jpeg);
    push('\nendstream\nendobj\n');
  });

  const total = 3 + 3 * images.length;
  const xref = offset;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(offset);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}
