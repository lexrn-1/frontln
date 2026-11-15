import { preloadImages, renderPage } from './board-renderer';
import { BOARD_HEIGHT, BOARD_WIDTH, BoardElement, BoardPage } from './models/board.models';
import { PdfImage, buildPdf } from './pdf-writer';

function pageCanvas(elements: readonly BoardElement[], scale: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BOARD_WIDTH * scale;
  canvas.height = BOARD_HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  ctx.scale(scale, scale);
  renderPage(ctx, elements);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('export-failed'))), type, quality)
  );
}

/** PNG de la página: solo el contenido del tablero, sin selección ni controles. */
export async function exportPagePng(page: BoardPage): Promise<Blob> {
  await preloadImages(page.elements);
  return toBlob(pageCanvas(page.elements, 1), 'image/png');
}

/** PDF con una página del tablero por página del documento. Funciona 100 % en el navegador. */
export async function exportPdf(pages: readonly BoardPage[]): Promise<Blob> {
  const images: PdfImage[] = [];
  for (const page of pages) {
    await preloadImages(page.elements);
    const canvas = pageCanvas(page.elements, 1);
    const jpeg = new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer());
    images.push({ jpeg, width: canvas.width, height: canvas.height });
  }
  return new Blob([buildPdf(images) as BlobPart], { type: 'application/pdf' });
}
