import { AttachmentDto, ConversationDto, MessageDto, MessagePageDto } from './chat.dto';
import { AvatarTone, ChatMessage, Conversation, FileAttachment, MessagePage } from './chat.models';

const TONES: AvatarTone[] = ['peach', 'mint', 'sky', 'rose', 'lavender'];

/** Tono estable a partir del uid (el backend aún no define avatar para mensajes). */
export function toneFor(key: string): AvatarTone {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export function toAttachment(dto: AttachmentDto): FileAttachment {
  return {
    id: dto.id,
    name: dto.fileName,
    size: dto.size,
    mimeType: dto.contentType,
  };
}

export function toMessage(dto: MessageDto, selfUid: string | null): ChatMessage {
  const name = dto.sender.displayName || 'Participante';
  return {
    id: dto.id,
    cursor: dto.cursor,
    roomId: dto.roomId,
    authorId: dto.sender.uid,
    authorName: name,
    authorInitial: name.trim().charAt(0).toUpperCase(),
    tone: (TONES as string[]).includes(dto.sender.avatar ?? '')
      ? (dto.sender.avatar as AvatarTone)
      : toneFor(dto.sender.uid),
    text: dto.text,
    attachments: (dto.attachments ?? []).map(toAttachment),
    sentAt: dto.createdAt,
    own: !!selfUid && dto.sender.uid === selfUid,
  };
}

export function toMessagePage(dto: MessagePageDto, selfUid: string | null): MessagePage {
  // El backend entrega de más reciente a más antiguo; la interfaz los muestra en orden cronológico.
  const messages = dto.items
    .map((m) => toMessage(m, selfUid))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id));
  return { messages, nextCursor: dto.nextCursor };
}

export function toConversation(dto: ConversationDto, selfUid: string | null): Conversation {
  const last = dto.lastMessage ? toMessage(dto.lastMessage, selfUid) : null;
  return {
    roomId: dto.roomId,
    name: dto.roomName,
    subject: dto.subject ?? '',
    tone: toneFor(dto.roomId),
    participantCount: dto.participantCount,
    unreadCount: dto.unreadCount,
    lastMessage: last
      ? {
          text: last.text,
          authorName: last.own ? 'Tú' : last.authorName,
          sentAt: last.sentAt,
          hasAttachments: last.attachments.length > 0,
        }
      : null,
    lastActivityAt: dto.lastActivityAt ?? last?.sentAt ?? null,
  };
}
