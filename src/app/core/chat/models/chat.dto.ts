/** DTO del chat de backend-realtime. Adjuntos y vistas de conversación se conservan
 * como tipos visuales de muestras, sin endpoints de producto para adjuntos/no leídos.
 */
export interface AttachmentDto {
  id: string;
  fileName: string;
  size: number;
  contentType: string;
}

export interface MessageDto {
  id: string;
  roomId: string;
  clientMessageId?: string;
  sender: { uid: string; displayName: string; avatar?: string };
  text: string;
  attachments?: AttachmentDto[];
  cursor?: string;
  /** ISO 8601 UTC. */
  createdAt: string;
}

export interface ConversationDto {
  roomId: string;
  roomName: string;
  subject?: string;
  participantCount: number;
  unreadCount: number;
  lastActivityAt: string | null;
  lastMessage: MessageDto | null;
}

export interface MessagePageDto {
  items: MessageDto[];
  /** Cursor para pedir mensajes anteriores; `null` si no hay más. */
  nextCursor: string | null;
}

export interface UnreadCountDto {
  total: number;
}

export interface SendMessageRequestDto {
  text: string;
  attachmentIds: string[];
  clientMessageId: string;
}
