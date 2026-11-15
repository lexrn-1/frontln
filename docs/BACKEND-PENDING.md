# Integraciones pendientes con backend

> Vigente y ampliado en [BACKEND-INTEGRATION.md](BACKEND-INTEGRATION.md) (chat, archivos, tablero, tiempo real, estados de integración). Este archivo conserva el detalle de salas, perfil y estadísticas.

Las pantallas privadas funcionan hoy con **mocks** (datos de demostración) porque el backend solo
publica `/session`, `/me`, `/me/complete`, `/session/logout` y `/demo` (ver INTEGRATION.md). Los
adaptadores HTTP de cada servicio devuelven el error `contract-pending` sin hacer ninguna petición:
no se inventaron endpoints, cuerpos ni DTO. Las rutas de la columna "Ruta del plan" salen del plan de
trabajo ("Contratos que deben acordarse en el Sprint 0") y están en `core/config/api-routes.ts`.

Para conectar cada una: implementar el método en el adaptador HTTP (`Http*Service`), añadir el DTO
"wire" con su mapper junto al modelo, y no tocar componentes ni stores.

## Salas (`core/rooms/services/rooms.service.ts`)

| Operación | Ruta del plan | Falta definir |
| --- | --- | --- |
| Salas del usuario | `GET /rooms` | DTO de sala; si el listado propio es otra ruta o un filtro |
| Catálogo "Explorar" | — | El plan dice **"sin catálogo público"** (el ID funciona como código de invitación). Las capturas incluyen "Explorar salas": decidir si existe, qué salas son descubribles y cómo se busca/filtra (texto, categoría) |
| Crear sala | `POST /rooms` | Cuerpo (solo `name` en las capturas), respuesta, longitud máxima del nombre (se propone 80) |
| Unirse con código | `POST /rooms/{id}/join` | **Formato del código**: el prototipo usa `SR-84K2`; el plan habla de un ID de alta entropía. Hoy `core/rooms/room-code.ts` valida `SR-XXXX` de forma provisional. Errores 404/409 |
| Consultar sala | `GET /rooms/{id}` | Respuesta |
| Eliminar sala | `DELETE /rooms/{id}` | Solo anfitrión (403 en otro caso) |
| Campos de la sala | — | `subject` (materia), `category` (Matemáticas/Ciencias/Derecho/Idiomas), `participantCount`, `status` (en curso/programada), `startsAt`, `isHost`, `isMember`: el plan no los define |

## Sesión de estudio y sala en vivo (`features/study-room/services/study-room.service.ts`)

| Operación | Canal | Falta definir |
| --- | --- | --- |
| Objetivo actual, progreso, inicio de sesión | REST | Endpoint y DTO (el plan no menciona objetivos ni progreso) |
| Participantes | Socket.IO `room:snapshot`, `participant:joined/left` | Payloads; la ruta pública `/socket.io/` aún responde 404 (EVIDENCE-public-api.md) |
| Historial de chat | `GET /rooms/{id}/messages` | Paginación por cursor y DTO |
| Enviar mensaje | Socket.IO `chat:send` / `chat:message` | `clientMessageId`, ack, deduplicación |
| Audio/vídeo, pantalla compartida | WebRTC + `rtc:signal`, `GET /rtc/config` | Todo: la interfaz solo cambia el estado visual de los controles |

## Perfil y configuración

| Operación | Falta definir |
| --- | --- |
| Editar perfil (US-04) | Método/cuerpo sobre `/me` (nombres, apellidos, username, avatar) y errores por campo |
| Carrera y universidad (en las capturas) | El contrato de `/me` **no** incluye estos campos. Hoy solo existen en el mock; en modo real se muestran como "Pendiente de backend" |
| Borrar cuenta (US-05) | Endpoint; el cliente ya cierra sesión tras la confirmación |
| Preferencias de Configuración (recordatorios, invitaciones, sonidos, perfil privado, subtítulos, contraste, idioma, zona horaria) | Aparecen en las capturas pero el plan no las contempla ni define endpoint. Hoy se guardan solo en `localStorage` (`PreferencesStore`) y no tienen efecto: falta definir dónde se persisten y qué función activa cada una |
| Cambiar correo (US-04) | Flujo Firebase (`verifyBeforeUpdateEmail`) y endpoint que mantenga coherencia Auth/perfil |

## Estadísticas y notificaciones

| Función | Falta definir |
| --- | --- |
| Racha, horas estudiadas, ritmo semanal, meta del día | Endpoint y DTO; el plan no define estadísticas. En real, la interfaz muestra el estado de error con reintento |
| Notificaciones (campana) | El plan solo prevé avisos en vivo dentro de la sala. Endpoint o evento realtime para notificaciones del usuario. Hoy la lista queda vacía ("Todo al día") |

## Datos de demostración

Viven en `core/rooms/mocks/`, `core/study/mocks/`, `features/*/mocks/` y `core/dev/dev-access.ts`
(perfil). La interfaz los rotula como "datos de demostración". El texto de la landing "2.400+
estudiantes" ya existía antes de este trabajo y es una cifra del prototipo, no un dato real.
