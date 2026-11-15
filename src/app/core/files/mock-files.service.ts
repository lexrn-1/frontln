import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { FileAttachment } from '../chat/models/chat.models';
import { AppError } from '../http/app-error';
import { mockFail, mockOk } from '../http/mock-latency';
import { FilesService } from './files.service';

/** MOCK: guarda los archivos en memoria de esta pestaña (se pierden al recargar). Solo desarrollo. */
@Injectable()
export class MockFilesService extends FilesService {
  readonly isDemo = true;
  private readonly files = new Map<string, { meta: FileAttachment; blob: Blob }>();

  upload(file: File): Observable<FileAttachment> {
    const meta: FileAttachment = {
      id: `f-${crypto.randomUUID().slice(0, 8)}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream'
    };
    this.files.set(meta.id, { meta, blob: file });
    return mockOk(meta);
  }

  download(fileId: string): Observable<Blob> {
    const entry = this.files.get(fileId);
    return entry ? mockOk(entry.blob) : mockFail(new AppError('file-not-found', 'El archivo ya no está disponible.', 404));
  }

  getMetadata(fileId: string): Observable<FileAttachment> {
    const entry = this.files.get(fileId);
    return entry ? mockOk(entry.meta) : mockFail(new AppError('file-not-found', 'El archivo ya no está disponible.', 404));
  }
}
