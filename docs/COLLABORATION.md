# Salas y colaboración implementadas

El frontend mantiene core/shared/features y Atomic Design. Las páginas usan stores; los adaptadores RoomsService, ChatService, RealtimeService y PeerConnectionsService encapsulan HTTP, Socket.IO y WebRTC. Los componentes reutilizan tarjetas, diálogos, lista/compositor y la molécula MediaStream para reproducción/autoplay.

## Configuración publicada

`src/app/core/config/runtime-config.public.ts` define API `https://api.5-253-232-179.sslip.io/api/v1`, realtime `https://api.5-253-232-179.sslip.io`, path `/socket.io/`. `useMocks:false`, `useFirebaseAuth:true`, `devAccess:false`. No usar localhost en Vercel. Los endpoints nuevos necesitan publicar ambos backends y las rutas del gateway antes de estar disponibles en ese dominio. Esta entrega no publica nada.

API: GET/POST /rooms, GET/PATCH/DELETE /rooms/{uuid}, POST /rooms/{uuid}/join y GET /rtc/config. Nombre recortado 1–100; UUID v4, OWNER puede editar/eliminar, panel lista salas propias. Chats obtiene membresías con scope=member; no existe endpoint /chats. Eliminar responde 202 con limpieza asíncrona. Invitados no ven edición/eliminación. Acceso directo a /salas/{id} conserva la vuelta tras login y solicita membresía idempotente.

Historial: GET /rooms/{id}/messages se dirige a **HTTP de realtime**, no a API. El gateway de producción enruta exactamente ese recurso al puerto 8080 de realtime; las otras operaciones /rooms van a API. /socket.io/ va al listener 9092 y admite polling+WebSocket. El overlay `compose.gateway.yaml` del backend documenta reglas y prioridades. Se conserva una réplica de realtime por presencia/capacidad en memoria.

Todos los contratos de colaboración exigen perfil completo e ID token Firebase. El handshake de producto es auth:{token}. Firebase verifica identidad; el servidor deriva propietario, remitente y permisos. No transmitir uid/role de formularios ni contraseñas a Quarkus. No introducir secretos administrativos en esta configuración pública.

## Chat y presencia

Una sola conexión Socket.IO por sesión de navegador, una sala activa por conexión. Entrar obtiene room:snapshot con connectionId y participantes; seis conexiones incluyen anfitrión y pestañas adicionales. ChatStore comparte historial entre sala y Chats: chat:send con UUID por intento; persistencia antes de ack; fusión por ID canónico, orden createdAt/ID; before para anteriores y after para recuperar tras reconexión/enfoque. Las fechas conservan nanosegundos, sin convertir el cursor a Date. Mensaje solo texto de 1–2000. Un ack perdido permite reintentar el borrador con la misma clave. Cierre de sesión limpia caches y descarta respuestas pendientes.

Room:deleted libera medios y navega al panel con anuncio. Los cambios de presencia se anuncian y se identifican por conexión, no por uid. La lista de mensajes conserva scroll al consultar anteriores y ofrece «Mensajes nuevos». No hay adjuntos, catálogo, horarios, tablero ni contadores persistidos de no leídos; las acciones correspondientes se ocultan/deshabilitan y /explorar vuelve al panel.

## Medios

Simple-peer 9.11.1, bundle browser para evitar polyfills globales Node; iniciador por orden connectionId. Hasta cinco pares por navegador; rtc:signal transporta SDP/ICE autorizado por sala. Micrófono/cámara se capturan solo al solicitarlos. Denegar permisos mantiene chat disponible. Pantalla reemplaza vídeo y al detener vuelve a cámara; salir detiene captura y destruye pares. Reproducción de audio remota dispone de botón si el navegador bloquea autoplay.

GET /rtc/config entrega STUN Google y TURN ExpressTURN UDP/TCP solo si backend tiene credenciales reales. xxxxxxxx no configura TURN. Las credenciales TURN son visibles al cliente autorizado y deben ser dedicadas/rotables; ninguna cuenta Firebase Admin entra al frontend. No se da por verificado relay entre redes reales por pasar pruebas con cámaras ficticias en una máquina.

## Pruebas reproducibles

Usar Node **22.16.0** y pnpm **10.11.0**, Java 21 para backend. Mantener repositorios hermanos backend/frontln en la misma carpeta. Node 26 no es el entorno validado de Playwright/Angular 17.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm run build
pnpm run test:ci
pnpm run build:integration
```

`test:ci` requiere Chrome/Chromium; si no está en PATH, exportar CHROME_BIN con la ruta de instalación. El build integration es exclusivamente local: usa Firebase Auth emulado y el proyecto demo-app-meet; nunca publicarlo en Vercel. El build normal conserva configuración pública HTTPS.

Desde backend:

```bash
./mvnw clean verify
cd tests/integration
npm ci
# Ejecuta backends, servidor estático/proxy de pruebas y seis contextos de navegador.
./node_modules/.bin/firebase emulators:exec --project demo-app-meet --config ../../firebase.json --only auth,firestore 'cd ../../../frontln && pnpm run test:e2e'
```

Puertos reservados: 4200, 20880, 20881, 20992, 9099, 8085 y puertos auxiliares Firebase. Playwright inicia/cierra procesos; el servidor Node es únicamente un fixture de pruebas, no un tercer servicio del producto. Las cámaras/micrófonos y pantalla de E2E son ficticios. E2E_PARTICIPANTS=3 permite diagnóstico reducido; la prueba completa usa seis por defecto. E2E_CHROMIUM permite indicar un ejecutable existente; CHROME_BIN solo afecta Karma.

Para desarrollo interactivo, iniciar emuladores y `node ../backend/tests/integration/browser-server.mjs`; después `pnpm exec ng serve --configuration integration`. La configuración del proxy local es `proxy.integration.json`. No usar Firebase real ni credenciales descargadas para estos comandos.

Estado y evidencia curada: docs/evidencias/salas-chat-local.txt en backend. Pendientes externos: imágenes Docker en entorno con daemon, publicación coordinada, índices/IAM reales, Vercel/CORS público, WSS/Traefik, firma Firebase real y TURN/dispositivos en redes diferentes.
