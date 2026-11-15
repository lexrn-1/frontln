# Integración frontend ↔ backend

Fuente única para conectar el frontend con el backend. **Los contratos marcados `PROPUESTO` los define el
frontend; backend no los ha publicado ni implementado** (no hay Swagger/OpenAPI de estas rutas). Si backend usa
otros nombres, se adapta solo el adaptador HTTP, su DTO y su mapper: componentes y stores no cambian.

## Estado de integración (etiquetas)

- **IMPLEMENTADO**: existe y está conectado al backend.
- **PREPARADO**: el frontend está listo y el adaptador HTTP existe, pero hay que activar su flag cuando backend publique la ruta.
- **MOCK**: funciona con datos simulados en desarrollo (modo `useMocks` o acceso de desarrollo).
- **PENDIENTE**: falta implementación.

| Funcionalidad | Estado | Dónde |
| --- | --- | --- |
| Registro, login, Google, perfil pendiente/completo, logout, `/session`, `/me`, `/me/complete` | **IMPLEMENTADO** | `core/auth` |
| Interceptor Bearer (solo API propia, renueva token, reintenta un 401) | **IMPLEMENTADO** | `core/auth/interceptors` |
| Interceptor global de errores (400/401/403/404/409/422/500, `AppError`) | **IMPLEMENTADO** | `core/interceptors/http-error.interceptor.ts` |
| Salas: listar, crear, unirse, consultar, editar nombre, eliminar, abandonar | **MOCK** + adaptador HTTP `contract-pending` (sin contrato del plan) | `core/rooms` |
| Chat: conversaciones, mensajes, paginación, enviar, leído, no leídos | **PREPARADO** (flag `features.chatApi`) + **MOCK** | `core/chat` |
| Archivos: subir, descargar, metadatos | **PREPARADO** (flag `features.filesApi`) + **MOCK** | `core/files` |
| Tablero: obtener, páginas, guardar, eliminar elementos | **PREPARADO** (flag `features.boardApi`) + **MOCK** | `features/study-room/board` |
| Exportar tablero a PNG y PDF | **IMPLEMENTADO** (100 % navegador) | `board-export.ts`, `pdf-writer.ts` |
| Tablero colaborativo en tiempo real | **PENDIENTE** (hay `operations$` como enganche) | `BoardStore` |
| Tiempo real (Socket.IO): conexión, eventos, reconexión | **PENDIENTE** (adaptador "no conectado") | `core/realtime` |
| Captura local de cámara y micrófono (`getUserMedia`) | **IMPLEMENTADO** (solo local) | `features/study-room/services/media.service.ts` |
| WebRTC (transmisión a otros) y señalización | **PENDIENTE** | `peer-connections.service.ts` |
| Compartir pantalla: captura local (`getDisplayMedia`) y vista en el escenario | **IMPLEMENTADO** (solo local) | `media.service.ts`, `screen-share-view` |
| Compartir pantalla: envío a los demás (`PeerConnectionsService.setScreen` reemplaza la pista de vídeo en cada par) | **PREPARADO** (gancho listo, falta WebRTC/señalización) | `peer-connections.service.ts` |
| Estados de cámara/micrófono de otros participantes | **PENDIENTE** (modelo listo: `micOn`, `camOn`) | `Participant` |
| Notificaciones del usuario | **PENDIENTE** (lista vacía, sin eventos inventados) | `core/notifications` |
| Estadísticas (racha, horas, ritmo) | **MOCK** | `core/study` |
| Perfil: editar, carrera/universidad, borrar cuenta; cambiar correo | **MOCK** | `features/profile`, `features/settings` |

## A. Configuración

Todo vive en `core/config/runtime-config.ts` (un solo lugar):

| Clave | Uso |
| --- | --- |
| `apiUrl` | URL base completa **con versión** (`https://…/api/v1`). Los servicios solo añaden `apiRoutes.*`. Cambiarla no toca ningún servicio. |
| `realtimeUrl`, `socketPath` | Origen y ruta de Socket.IO (`/socket.io/`). Hoy la ruta pública responde 404 (EVIDENCE-public-api.md). |
| `useMocks` | `true`: todos los servicios usan su mock. `false`: adaptadores HTTP. |
| `features.chatApi / filesApi / boardApi` | `false` mientras la ruta sea solo propuesta: el adaptador no hace peticiones (`contract-pending`). Pasar a `true` al publicarse. |
| `chat.pageSize` | Mensajes por página (30). |
| `pagination.defaultPageSize` | Tamaño por defecto de listados (20). |
| `files.maxSizeBytes`, `files.maxFiles`, `files.allowedExtensions` | Límites de adjuntos (10 MB, 5 archivos, png/jpg/jpeg/webp/pdf/doc/docx/xls/xlsx/csv/ppt/pptx/txt). El backend debe validar también. |
| `devAccess` | Acceso de desarrollo temporal (solo `isDevMode()`). |

Rutas REST: `core/config/api-routes.ts`. **Headers**: `Authorization: Bearer <ID token de Firebase>` (lo añade el interceptor únicamente a `apiUrl`; nunca a health, demo ni terceros). Fechas: ISO 8601 UTC.

Selección de adaptadores: `provideRooms()`, `provideStudyStats()`, `provideChat()`, `provideRealtime()` en `app.config.ts` y `provideStudyRoom()/provideProfile()/provideSettings()` por ruta. Mock = `useMocks || isDevAccessActive()`.

## B. Autenticación — IMPLEMENTADO

Contrato en INTEGRATION.md: `GET /session`, `GET /me`, `POST /me/complete`, `POST /session/logout`. Firebase Auth en el cliente (correo y Google); el token se renueva ante un 401 y, si persiste, se cierra sesión con `?motivo=expired` conservando `returnUrl`. Los tokens no se muestran ni se registran.

## C. Usuarios

| Operación | Método y ruta | Estado | Falta definir |
| --- | --- | --- | --- |
| Consultar perfil | `GET /me` | IMPLEMENTADO | — |
| Actualizar perfil (US-04) | `PATCH /me` **PROPUESTO** | MOCK | Cuerpo `{firstName,lastName,username,avatar}`; 409 `USERNAME_TAKEN` con `fields` |
| Carrera y universidad | campos en `/me` | MOCK | El contrato actual no los incluye; no se envían |
| Cambiar correo | Firebase `verifyBeforeUpdateEmail` + sincronizar perfil **PROPUESTO** | MOCK | 409 si el correo existe; reautenticación con contraseña |
| Borrar cuenta (US-05) | `DELETE /me` **PROPUESTO** | MOCK | Política de salas y mensajes del usuario |

## D. Salas — adaptador HTTP `contract-pending`, MOCK

| Operación | Método y ruta | Notas |
| --- | --- | --- |
| Listar mías | `GET /rooms` (plan) | DTO de sala por definir |
| Catálogo "Explorar" | `GET /rooms?q=&category=&page=&size=` **PROPUESTO** | El plan dice "sin catálogo público": decidir si existe |
| Crear | `POST /rooms` (plan) `{name}` | Máx. 80 caracteres (propuesto) |
| Consultar | `GET /rooms/{id}` | 404 si no existe |
| Editar nombre | `PATCH /rooms/{id}` `{name}` **PROPUESTO** | 403 si no es anfitrión; 409 nombre repetido |
| Eliminar | `DELETE /rooms/{id}` | 403 si no es anfitrión |
| Unirse | `POST /rooms/{id}/join` (plan) | 404 inexistente. **Formato del ID**: hoy `SR-XXXX` provisional (`core/rooms/room-code.ts`) |
| Abandonar | `POST /rooms/{id}/leave` **PROPUESTO** | El anfitrión no puede abandonar |
| Participantes | `GET /rooms/{id}/participants` **PROPUESTO** o evento `room:snapshot` | Incluir `micOn`, `camOn` |

Crear sala envía `{name, category, schedule}` (propuesto): `category` ∈ programacion|matematicas|ciencias|literatura|derecho|idiomas|otras; `schedule` = `null` o `{frequency: once|daily|weekly, time: "HH:mm", date?: "AAAA-MM-DD", weekdays?: [0..6 (lunes=0)]}` en hora local (zona horaria por definir). El servidor debe devolver `startsAt` = próxima ocurrencia.

Campos de sala que el plan no define: `schedule`, `subject`, `category`, `participantCount`, `status`, `startsAt`, `isHost`, `isMember`.

## E. Chat — PREPARADO (`features.chatApi`) + MOCK

**Una sola conversación por sala.** El chat integrado en `/salas/:id` y el apartado `/chats` usan el mismo `ChatStore` (`core/chat/store`), por tanto los mismos mensajes, ids, archivos, historial y no leídos. Ninguna interfaz guarda mensajes por su cuenta.

| Operación | Método y ruta (todas **PROPUESTAS**) | Respuesta | Errores |
| --- | --- | --- | --- |
| Listar conversaciones | `GET /chats` | `ConversationDto[]` | 401 |
| Consultar conversación | `GET /chats/{roomId}` | `ConversationDto` | 403 no pertenece, 404 |
| Consultar mensajes | `GET /chats/{roomId}/messages?limit=30&before=<cursor>` | `{items: MessageDto[], nextCursor}` (más reciente primero) | 403, 404 |
| Enviar mensaje | `POST /chats/{roomId}/messages` `{text, attachmentIds[], clientMessageId}` | `MessageDto` (201) | 400/422 vacío o demasiado largo, 403, 404; reintento con el mismo `clientMessageId` no duplica |
| Marcar leídos | `PATCH /chats/{roomId}/read` | 204 | 403 |
| No leídos | `GET /chats/unread-count` | `{total}` | — |

DTO en `core/chat/models/chat.dto.ts`; mapeo a modelos de dominio en `chat.mapper.ts`:

```json
// MessageDto
{ "id": "m1", "roomId": "SR-8462", "clientMessageId": "uuid", "sender": { "uid": "u1", "displayName": "Ana Ruiz" },
  "text": "Hola", "attachments": [ { "id": "f1", "fileName": "apuntes.pdf", "size": 12034, "contentType": "application/pdf" } ],
  "createdAt": "2026-11-15T10:00:00Z" }
// ConversationDto
{ "roomId": "SR-8462", "roomName": "Cálculo II · Integrales", "subject": "Matemáticas", "participantCount": 5,
  "unreadCount": 2, "lastActivityAt": "2026-11-15T10:00:00Z", "lastMessage": { /* MessageDto */ } }
```

Reglas de autorización: solo miembros de la sala leen o escriben; el servidor decide `uid` y pertenencia. El frontend ya muestra "No puedes ver esta conversación" ante 403/404 y valida el formato del id antes de llamar.

Comportamiento del cliente: paginación hacia atrás con cursor (`Cargar mensajes anteriores`, conserva la posición de lectura), auto-scroll solo si el usuario está al final, "Mensajes nuevos" si no, marca como leído al abrir la conversación, contador total en la barra lateral, mensajes ordenados cronológicamente.

## F. Archivos — PREPARADO (`features.filesApi`) + MOCK

| Operación | Método y ruta (**PROPUESTOS**) | Notas |
| --- | --- | --- |
| Subir | `POST /files` `multipart/form-data`, campo `file` | Devuelve `AttachmentDto`. Un archivo por petición |
| Descargar | `GET /files/{fileId}` | Binario con `Content-Disposition`; 403 si no es miembro de la sala del mensaje |
| Metadatos | `GET /files/{fileId}/metadata` | `AttachmentDto` |
| Asociar a mensaje | `attachmentIds` en `POST /chats/{roomId}/messages` | El cliente sube primero y luego envía el mensaje |

Validaciones del cliente (`shared/utils/file-validation.ts`): extensión permitida, MIME coherente con la extensión, no vacío, tamaño máximo y cantidad máxima. **El backend debe repetirlas** (no confiar en el cliente) y elegir almacenamiento (hoy no existe). El modo MOCK guarda los archivos en memoria de la pestaña; no hay subida real.

## G. Tablero — PREPARADO (`features.boardApi`) + MOCK

Modelos en `features/study-room/board/models` (`Board`, `BoardPage`, `BoardElement` por tipo, `BoardOperation`, `BoardState`). Espacio lógico 1600×1000.

| Operación | Método y ruta (**PROPUESTOS**) |
| --- | --- |
| Obtener tablero | `GET /rooms/{roomId}/board` → `{roomId, pages:[{id, elements:[BoardElementDto]}]}` |
| Crear página | `POST /rooms/{roomId}/board/pages` |
| Actualizar página (reemplazo) | `PUT /rooms/{roomId}/board/pages/{pageId}` |
| Eliminar página | `DELETE /rooms/{roomId}/board/pages/{pageId}` |
| Guardar elementos | `POST /rooms/{roomId}/board/pages/{pageId}/elements` |
| Eliminar elementos | `DELETE /rooms/{roomId}/board/pages/{pageId}/elements` `{ids}` |
| Estado | `GET /rooms/{roomId}/board/state` → `{revision, updatedAt}` |

Tipos de elemento: `pen`, `line`, `arrow`, `rect`, `ellipse`, `text`, `image` (`src` = URL de datos, reducida a 1600 px; backend debería guardarla como archivo y devolver una URL), `table` (`rows`, `cols`, `cells[]`) e `icon` (`glyph`, `size`).

`BoardElementDto = {id, type, color, width, authorUid, createdAt, data}` donde `data` lleva la geometría (`points`, `from/to`, `x/y/w/h`, `text/size`). El cliente guarda la página completa con un debounce de 700 ms **solo si el servidor respondió al cargar**; si no, el tablero funciona en local y lo indica en pantalla. **Sincronización con otros**: PENDIENTE; `BoardStore.operations$` emite `element.add|update|remove`, `page.replace|add|remove` para enviarlas por WebSocket cuando exista. No se simula que otros vean los trazos ni se usa WebRTC para ello. Exportación PNG/PDF: 100 % en el navegador (el PDF se genera con un escritor propio, sin dependencias).

## H. Notificaciones — PENDIENTE

El plan solo prevé avisos en vivo dentro de la sala. Falta definir `GET /notifications`, marcar como leídas y el evento realtime. La campana muestra "Todo al día" y no inventa eventos.

## I. Audio y video — captura local IMPLEMENTADA, resto PENDIENTE

- `getUserMedia` real con manejo de permisos denegado, sin dispositivo y navegador no compatible; mensaje con instrucciones y opción de seguir con el chat; las pistas se detienen al salir de la sala.
- Compartir pantalla y tablero ocupan el escenario (participantes en tira y chat visibles, controles abajo); solo uno a la vez. Al integrar WebRTC basta implementar `setScreen` en el adaptador.
- Pendiente de backend: señalización Socket.IO (`rtc:signal`), `GET /rtc/config` (STUN/TURN), snapshot de participantes con `micOn`/`camOn`, eventos de cambio de estado multimedia. WebSocket solo señaliza; el audio y el vídeo viajarían por WebRTC (`PeerConnectionsService`, hoy "no conectado").

## Tiempo real (Socket.IO) — PENDIENTE

`core/realtime/realtime.service.ts` define `RealtimeService` (estado, `events$`, conectar, desconectar, unirse y salir de sala) y los eventos propuestos:
`connection.connected`, `connection.disconnected`, `message.created`, `message.updated`, `message.deleted`, `message.read`, `conversation.updated`, `participant.joined`, `participant.left`. Hoy solo existe `NotConnectedRealtimeService` (no abre conexión). `ChatStore` y `StudyRoomStore` ya consumen `events$` (nuevo mensaje, entrada y salida con aviso accesible). Para integrarlo: instalar `socket.io-client` **solo entonces**, autenticar con el ID token en el handshake (`auth`), unir a la sala, renovar token al reconectar y recuperar historial faltante por cursor. El plan indica además `room:join`, `room:snapshot`, `chat:send`, `media:update`: adaptar los nombres en el adaptador.

## J. Códigos de respuesta

| Código | Significado en el cliente |
| --- | --- |
| 400 / 422 | Datos inválidos; `fieldErrors`/`fields` se muestran junto al campo (`AppError.fieldErrors`) |
| 401 | Token inválido: renueva y reintenta una vez; si persiste, cierra sesión (`?motivo=expired`) y vuelve a la ruta pedida tras el login |
| 403 | Sin permiso: aviso global único + mensaje del servicio (p. ej. "Solo el anfitrión…") |
| 404 | Recurso inexistente: estado de error de la pantalla (sala, conversación) |
| 409 | Conflicto (username, correo o nombre repetido): mensaje junto al campo |
| 5xx / sin red | Aviso global único + estado de error con "Reintentar" |

Formato de error acordado: `{code, message, fieldErrors|fields:[{field,message}], traceId}`; `code` se normaliza a kebab-case.

## K. Pruebas relevantes

`ng test` cubre: tablero (herramientas, historial, páginas, zoom, exportación PNG/PDF real), chat compartido entre interfaces, paginación, no leídos, archivos, interceptor de errores, tabla de rutas y guards, semántica accesible de la lista de mensajes.
