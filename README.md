# FrontMeet (Frontend)

Aplicación Angular 17 standalone (SPA) construida con Tailwind CSS, Angular Material y SCSS,
siguiendo `core` / `shared` / `features` / `layouts` y Atomic Design. El flujo es
página → store reactivo (signals) → servicio HTTP → API REST.

La arquitectura y las reglas de importación están en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Uso

1. Ejecuta `npm install`.
2. Ejecuta `npm start`.
3. Abre `http://localhost:4200`.

## Estado: Sprint 0 y Sprint 1 (mockup listo para conectar backend)

Rutas implementadas (plan en `docs/guia/`):

| Ruta                | Acceso                         | Historia            |
| ------------------- | ------------------------------ | ------------------- |
| `/`                 | Pública                        | Sprint 0 (landing + lectura API → Firestore) |
| `/registro`         | Solo sin sesión (`guestGuard`) | US-01, US-02        |
| `/login`            | Solo sin sesión (`guestGuard`) | US-03               |
| `/completar-perfil` | Identidad sin perfil (`incompleteProfileGuard`) | US-02 |
| `/dashboard`        | Sesión + perfil (`authGuard`)  | Destino tras login (panel completo en Sprint 2) |

### Modo simulado

Con `runtimeConfig.useMocks = true` la app funciona sin backend: los adaptadores de
`core/auth/services/mock/` imitan `backend-api` (y Firebase Auth si `useFirebaseAuth = false`)
y guardan los datos en `localStorage` (`frontmeet.mock-db.v1`; bórralo para reiniciar).

Con identidad simulada (`useFirebaseAuth = false`):

- Cuenta de prueba: `marina.lopez@universidad.edu` / `Estudio2026`.
- "Continuar con Google" simula un primer acceso y lleva a completar perfil.
- El username `marina.lopez` está ocupado, para probar el conflicto 409.

### Conectar el backend

1. Ajusta `apiUrl` y `realtimeUrl` en `src/app/core/config/runtime-config.ts`.
2. Firebase Auth ya está conectado (`useFirebaseAuth: true`, proyecto `appmeet-dev`). En la
   consola de Firebase deben estar habilitados los proveedores *Correo/contraseña* y *Google*,
   y el dominio de despliegue debe figurar en *Authentication → Dominios autorizados*.
3. Pon `useMocks: false` para usar backend-api real. Componentes, store y guards no cambian.

Contratos esperados de `backend-api` (sobre `ApiResponse<T>`, errores con `code`, `message`,
`fieldErrors`, `traceId`; token `Authorization: Bearer <ID token de Firebase>`):

| Método | Ruta                                        | Uso                                   |
| ------ | ------------------------------------------- | ------------------------------------- |
| GET    | `/api/v1/health`                            | Sprint 0: estado + dato de Firestore  |
| GET    | `/api/v1/me`                                | Perfil; 404 `profile-not-found` si falta |
| POST   | `/api/v1/me`                                | Crear perfil; 409 `username-taken`    |
| GET    | `/api/v1/usernames/{username}/availability` | Disponibilidad orientativa            |

## Despliegue

- Build de producción: `npm run build` (salida en `dist/frontmeet`).
- Pensado para desplegar en Vercel (`vercel.json`). Vercel instala con pnpm y
  `--frozen-lockfile`: al cambiar dependencias sincroniza `pnpm-lock.yaml` y `package-lock.json`.
  Mantén `.npmrc` (`node-linker=hoisted`) para Angular Material.

## Pruebas unitarias

Ejecuta `npm test` para correr los archivos `*.spec.ts` con Jasmine y Karma en
ChromeHeadless. Se necesita Chrome o Chromium instalado (o define `CHROME_BIN`).
