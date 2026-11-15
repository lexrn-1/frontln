import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { apiRoutes } from '../config/api-routes';
import { runtimeConfig } from '../config/runtime-config';
import { AttachmentDto } from '../chat/models/chat.dto';
import { FileAttachment } from '../chat/models/chat.models';
import { toAttachment } from '../chat/models/chat.mapper';
import { whenEnabled } from '../http/feature-flag';

/**
 * Archivos adjuntos (sin estado). Contrato PROPUESTO (PENDIENTE DE IMPLEMENTACIÓN EN BACKEND):
 * `POST /files` (multipart/form-data, campo `file`) → AttachmentDto; `GET /files/{id}` → binario;
 * `GET /files/{id}/metadata` → AttachmentDto. El backend debe validar tipo y tamaño también.
 */
export abstract class FilesService {
  abstract readonly isDemo: boolean;
  abstract upload(file: File): Observable<FileAttachment>;
  abstract download(fileId: string): Observable<Blob>;
  abstract getMetadata(fileId: string): Observable<FileAttachment>;
}

@Injectable()
export class HttpFilesService extends FilesService {
  readonly isDemo = false;
  private readonly http = inject(HttpClient);
  private readonly base = runtimeConfig.apiUrl;

  upload(file: File): Observable<FileAttachment> {
    return whenEnabled('filesApi', `POST ${apiRoutes.files}`, () => {
      const form = new FormData();
      form.append('file', file, file.name);
      return this.http.post<AttachmentDto>(`${this.base}${apiRoutes.files}`, form).pipe(map(toAttachment));
    });
  }

  download(fileId: string): Observable<Blob> {
    return whenEnabled('filesApi', `GET ${apiRoutes.file(fileId)}`, () =>
      this.http.get(`${this.base}${apiRoutes.file(fileId)}`, { responseType: 'blob' })
    );
  }

  getMetadata(fileId: string): Observable<FileAttachment> {
    return whenEnabled('filesApi', `GET ${apiRoutes.fileMetadata(fileId)}`, () =>
      this.http.get<AttachmentDto>(`${this.base}${apiRoutes.fileMetadata(fileId)}`).pipe(map(toAttachment))
    );
  }
}
