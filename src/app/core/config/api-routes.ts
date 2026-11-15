/**
 * Rutas REST relativas a `runtimeConfig.apiUrl`.
 *
 * Solo contiene las rutas que menciona el plan de trabajo ("Contratos que deben acordarse en el
 * Sprint 0": /me, /rooms, /rooms/{id}/join, /rooms/{id}/messages y /rtc/config). El plan NO fija
 * método, cuerpo ni respuesta de cada una: eso lo publica backend (ver docs/BACKEND-PENDING.md).
 */
export const apiRoutes = {
  me: '/me',
  rooms: '/rooms',
  room: (id: string) => `/rooms/${encodeURIComponent(id)}`,
  roomJoin: (id: string) => `/rooms/${encodeURIComponent(id)}/join`,
  /** Del plan; sustituida por `chatMessages` (contrato propuesto del chat unificado). */
  roomMessages: (id: string) => `/rooms/${encodeURIComponent(id)}/messages`,
  // --- Contratos PROPUESTOS por el frontend (PENDIENTE DE IMPLEMENTACIÓN EN BACKEND) ---
  chats: '/chats',
  chatsUnread: '/chats/unread-count',
  chat: (roomId: string) => `/chats/${encodeURIComponent(roomId)}`,
  chatMessages: (roomId: string) => `/chats/${encodeURIComponent(roomId)}/messages`,
  chatRead: (roomId: string) => `/chats/${encodeURIComponent(roomId)}/read`,
  files: '/files',
  file: (id: string) => `/files/${encodeURIComponent(id)}`,
  fileMetadata: (id: string) => `/files/${encodeURIComponent(id)}/metadata`,
  board: (roomId: string) => `/rooms/${encodeURIComponent(roomId)}/board`,
  boardPages: (roomId: string) => `/rooms/${encodeURIComponent(roomId)}/board/pages`,
  boardPage: (roomId: string, pageId: string) => `/rooms/${encodeURIComponent(roomId)}/board/pages/${encodeURIComponent(pageId)}`,
  roomLeave: (id: string) => `/rooms/${encodeURIComponent(id)}/leave`,
  roomParticipants: (id: string) => `/rooms/${encodeURIComponent(id)}/participants`,
  rtcConfig: '/rtc/config'
} as const;
