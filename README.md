# FrontMeet (Frontend)

SPA Angular 17 con Tailwind, Material y SCSS. Mantiene `core` / `shared` / `features`, stores con signals y adaptadores HTTP. Ver [arquitectura](docs/ARCHITECTURE.md) y [conexión pública](docs/INTEGRATION.md).

## Ejecutar y compilar

```bash
pnpm install --frozen-lockfile
pnpm start
pnpm run build
```

La pantalla local abre en `http://localhost:4200`, pero sus peticiones usan la API HTTPS publicada. La compilación activa tiene Firebase Auth real y mocks de backend deshabilitados.

| Uso | Configuración activa |
|---|---|
| API REST | https://api.5-253-232-179.sslip.io/api/v1 |
| Readiness | https://api.5-253-232-179.sslip.io/q/health/ready |
| Origen realtime | https://api.5-253-232-179.sslip.io |
| Path Socket.IO | /socket.io/ |

La configuración pública vive en `src/app/core/config/runtime-config.ts`. No contiene credenciales administrativas. Una configuración alternativa local debe activarse explícitamente; no se usa localhost como destino predeterminado del backend.

## Flujos conectados

- Firebase SDK registra/inicia sesión por correo o Google; Quarkus valida su ID token.
- `GET /session` determina si corresponde completar perfil o entrar; solo un perfil completo consulta `GET /me`.
- `POST /me/complete` recibe firstName/lastName/username/avatar. El adaptador conserva nombres españoles y tonos visuales en el formulario y los traduce al contrato wire.
- El username se confirma al guardar. Un 409 USERNAME_TAKEN conserva formulario/cuenta para reintento; no existe un endpoint previo de disponibilidad.
- `POST /session/logout` invalida el token actual y luego Firebase signOut limpia la sesión local, también si falla la petición remota.
- El indicador público lee readiness y el mensaje demo por separado. Un demo ausente no inventa métricas ni convierte readiness UP en caída.

Rutas UI: `/`, `/registro`, `/login`, `/completar-perfil`, `/dashboard`. El dashboard completo corresponde a Sprint 2. Un fallo temporal de API durante la restauración permite reintentar desde login; los guards no quedan esperando indefinidamente.

Los dominios institucionales siguen pendientes: una lista vacía permite cualquier correo válido, igual que backend. Los proveedores y dominios autorizados de Firebase deben estar configurados para la aplicación real.

## Pruebas

```bash
pnpm test
```

Se requiere Chrome/Chromium o `CHROME_BIN`. Las pruebas usan Jasmine, Karma y HttpTestingController; no crean usuarios reales. Cubren contratos, mapeo de datos, estados de sesión, guards, errores, token Bearer, logout y health/demo.

## Vercel y gateway

`vercel.json` mantiene `pnpm run build`, salida `dist/frontmeet/browser` y fallback SPA. Se requiere redeploy para publicar estos cambios; no se ejecutó publicación desde esta entrega. No cambiar las URLs a `/q/health/ready/api/...`: readiness y API de negocio son rutas independientes.

En Dokploy debe dirigirse `/socket.io/` a backend-realtime:9092 y el resto a backend-api:8080. La revisión pública inicial devolvió 404 en Socket.IO; el cambio remoto de enrutamiento sigue pendiente. No hay funcionalidad frontend de salas/chat/WebRTC en esta entrega.

Los adaptadores mock se conservan solo para activación explícita con `useMocks: true` (e identidad simulada con `useFirebaseAuth: false`). No están activos en la configuración publicada por el build actual.
