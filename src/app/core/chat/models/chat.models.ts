/**
 * Modelos de dominio del chat. UNA sola conversación por sala: el chat integrado en `/salas/:id`
 * y el apartado `/chats` consumen estos mismos modelos a través de `ChatStore`.
 */
export type AvatarTone = 'peach' | 'mint' | 'sky' | 'rose' | 'lavender';

export interface FileAttachment {
  id: string;
  name: string;
  /** Tamaño en bytes. */
  size: number;
  mimeType: string;
}

export interface ChatMessage {
  cursor?: string;
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  authorInitial: string;
  tone: AvatarTone;
  text: string;
  attachments: FileAttachment[];
  /** ISO 8601 UTC. */
  sentAt: string;
  own: boolean;
}

export interface ConversationPreview {
  text: string;
  authorName: string;
  sentAt: string;
  hasAttachments: boolean;
}

export interface Conversation {
  roomId: string;
  name: string;
  subject: string;
  tone: AvatarTone;
  participantCount: number;
  unreadCount: number;
  lastMessage: ConversationPreview | null;
  /** Para ordenar por actividad reciente. */
  lastActivityAt: string | null;
}

/** Página del historial, de la más reciente a la más antigua: `nextCursor` pide los anteriores. */
export interface MessagePage {
  messages: ChatMessage[];
  nextCursor: string | null;
}

export interface MessageQuery {
  /** Cursor devuelto por la página anterior; sin él se piden los últimos mensajes. */
  before?: string | null;
  after?: string | null;
  limit: number;
}

export interface SendMessageRequest {
  text: string;
  attachmentIds: string[];
  /** Estable por intento: permite al backend deduplicar reintentos. */
  clientMessageId: string;
}

export interface OutgoingMessage {
  text: string;
  files: File[];
}
