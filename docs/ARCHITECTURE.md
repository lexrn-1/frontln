# Arquitectura del Frontend

## Estructura de capas

```
src/app/
├── core/       # Infraestructura transversal
├── shared/     # Componentes y utilidades reutilizables
├── features/   # Módulos funcionales
└── layouts/    # Layouts de la aplicación
```

### `core/` — Infraestructura transversal

Contiene servicios, guards, interceptors y stores que son fundamentales para el funcionamiento de la aplicación. No depende de ninguna otra capa interna.

```text
core/
├── auth/          # Autenticación (ver abajo)
├── config/        # runtime-config.ts: URL de la API y valores por defecto
├── http/          # Contratos HTTP directos y errores normalizados
├── interceptors/  # Interceptors transversales (p. ej. manejo de errores HTTP)
├── layout/        # Shell de las pantallas autenticadas y servicios de navegación
└── utils/         # Utilidades de infraestructura (fechas, etc.)
```

### Autenticación en `core/auth/`

La autenticación completa vive en `core`, incluidos sus componentes de login, registro
y cuenta. Se organiza en las siguientes capas:

```text
core/auth/
├── models/        # Modelos de sesión, usuario y contratos HTTP
├── components/    # Login/registro y cuenta, con sus plantillas
├── services/      # AuthService: peticiones HTTP a /api/v1/session y /api/v1/me
├── store/         # AuthStore: sesión, token, usuario, roles, persistencia y expiración
├── guards/        # Protección de rutas según sesión y permisos
└── interceptors/  # Envío del token Bearer
```

El flujo es `Componente → AuthStore → AuthService → HTTP`. Los guards, interceptores
y el arranque de la aplicación consultan el store. `AuthService` no conserva estado.
Los componentes de autenticación pueden importar componentes de UI de `shared/`;
esta es una excepción explícita a la restricción general de `core/`.

### `shared/` — Componentes y utilidades reutilizables

Contiene componentes UI organizados por Atomic Design y utilidades compartidas. No depende de ninguna otra capa interna.

| Subcarpeta      | Responsabilidad                                                |
| --------------- | -------------------------------------------------------------- |
| `ui/atoms/`     | Componentes atómicos (button, input, select, spinner, etc.)    |
| `ui/molecules/` | Componentes moleculares (search-box, confirm-dialog, etc.)     |
| `ui/organisms/` | Componentes organismo (data-table, sidebar, topbar, etc.)      |
| `ui/templates/` | Templates de página reutilizables                              |
| `validators/`   | Validadores personalizados para Reactive Forms                 |
| `utils/`        | Funciones utilitarias compartidas                              |

### `features/` — Módulos funcionales

Cada feature es un módulo funcional independiente con su propia ruta, componentes, servicios y store:

```text
features/<feature>/
├── <feature>-page.component.ts|html   # Página enrutable
├── components/                        # Componentes de negocio de la feature
├── models/                            # Modelos y contratos HTTP
├── services/                          # Servicios HTTP (sin estado)
└── store/                             # Store con signals
```

### `layouts/` — Layouts de la aplicación

Layouts de página que componen organismos de `shared/` y alojan el `router-outlet` de las rutas hijas.

## Pantallas privadas, shell y datos de dominio

Rutas (`app.routes.ts`): `/dashboard`, `/explorar`, `/perfil` y `/configuracion` cuelgan del shell
`layouts/app-shell` (barra lateral + cabecera + modales Crear/Unirse/Eliminar sala); `/salas/:id`
(sala de estudio) va a pantalla completa. Todas usan `privateRouteGuard`, que equivale a
`authGuard` salvo con el acceso de desarrollo activo (ver abajo). El login, el registro y
`completar-perfil` no se modificaron (el login solo aloja el botón de desarrollo).

Dado que un feature no puede importar de otro, los datos que comparten varias pantallas viven en
`core/`, igual que la autenticación:

```text
core/
├── rooms/          # Room, RoomsService (abstracto + HTTP pendiente + mock), RoomsStore, room-code
├── study/          # StudyStats: racha, horas y ritmo semanal (service + mock + store)
├── notifications/  # NotificationsStore (lista vacía hasta que exista contrato)
├── layout/         # RoomDialogs (abre los modales del shell), Announcer (avisos accesibles)
├── config/api-routes.ts   # rutas REST citadas por el plan de trabajo
├── http/contract-pending.ts
└── dev/            # ACCESO DE DESARROLLO (temporal)
```

Features nuevos, cada uno con `models/`, `services/` (abstracto + adaptador HTTP + mock en `mocks/`),
`store/` y `*.providers.ts` cuando el adaptador se elige por ruta:

| Feature | Ruta | Notas |
| --- | --- | --- |
| `dashboard` | `/dashboard` | `DashboardStore` solo compone `RoomsStore` y `StudyStatsStore` |
| `explore-rooms` | `/explorar` | búsqueda con debounce, categorías, estados de carga/vacío/error |
| `study-room` | `/salas/:id` | controles solo visuales; sin WebRTC ni Socket.IO |
| `profile` | `/perfil` | ver/editar, validaciones, borrado de cuenta |
| `settings` | `/configuracion` | preferencias de las capturas (notificaciones, privacidad, accesibilidad, idioma y zona horaria; solo se guardan en el navegador), cambio de correo con reautenticación y cierre de sesión |

Componentes compartidos nuevos en `shared/ui/`: atoms `progress-ring`; molecules `modal-dialog`
(`<dialog>` nativo), `confirm-dialog`, `search-box`, `filter-chips`, `empty-state`, `toast`;
organisms `sidebar`, `topbar`, `notification-panel`, `room-card`, `create-room-dialog`,
`join-room-dialog`. Todos son presentacionales; `shared/validators/room.validators.ts` añade las
validaciones de nombre de sala y código. El formato del código lo aporta `core/rooms/room-code.ts`
(provisional, ver BACKEND-PENDING.md) mediante un input, de modo que `shared` no depende de `core`.

### Chat, archivos, tiempo real y tablero

- `core/chat`: `ChatStore` es la **única** fuente del chat. El chat integrado de `/salas/:id` y `/chats` son dos interfaces
  (`shared/ui/organisms/message-list` y `message-composer`) sobre el mismo store: no hay historiales duplicados ni arrays locales.
  Capas: `models/chat.models.ts` (dominio) · `chat.dto.ts` (DTO propuestos) · `chat.mapper.ts` · `services/chat.service.ts`
  (abstracto + HTTP) · `mocks/` · `store/`.
- `core/files`: `FilesService` (multipart) + mock en memoria. Validación de adjuntos en `shared/utils/file-validation.ts`.
- `core/realtime`: `RealtimeService` y eventos propuestos; solo existe el adaptador "no conectado" (sin Socket.IO instalado).
- `core/interceptors/http-error.interceptor.ts`: convierte errores HTTP de la API propia en `AppError`, avisa una vez de 403/5xx/sin red y deja 400/404/409/422 a quien llama.
- `core/http/feature-flag.ts` + `runtimeConfig.features`: los adaptadores de contratos *propuestos* no tocan la red hasta que backend confirme la ruta.
- `features/chats`: `/chats` y `/chats/:roomId` (lista + conversación, móvil: lista primero). Verifica el id y la pertenencia antes de mostrar nada.
- `features/study-room/board`: tablero (modelos, geometría, renderizador de canvas, exportación PNG/PDF propia, `BoardStore` con historial por página, servicio HTTP/mock) y `components/board/board-dialog`.
- `features/study-room/services/media.service.ts` (captura local) y `peer-connections.service.ts` (WebRTC pendiente).
- `features/not-found`: página 404 (`**`).

Contratos y estado de cada funcionalidad: [BACKEND-INTEGRATION.md](BACKEND-INTEGRATION.md).

### Mocks y adaptadores

Cada servicio de datos es una clase abstracta con dos adaptadores: HTTP (`contractPending`, que
devuelve el error `contract-pending` en lugar de inventar un contrato) y mock (datos de demostración
en archivos `mocks/`, rotulados como tales en la interfaz). Se usa el mock si
`runtimeConfig.useMocks` es `true` o si el acceso de desarrollo está activo; en cualquier otro caso,
el adaptador HTTP. Ningún componente contiene datos simulados.

### Acceso de desarrollo (temporal)

`core/dev/`: botón "Entrar al panel (solo desarrollo)" en el login. Solo existe si
`runtimeConfig.devAccess` es `true` **y** `isDevMode()` (por eso `angular.json` define las
configuraciones `development` —usada por `ng serve`— y `production` —por defecto en `ng build`—).
No toca `AuthStore`, Firebase ni los guards reales: guarda un indicador en `sessionStorage` que solo
lee `privateRouteGuard`, y se activa/desactiva con una recarga completa para que la DI elija los mocks.
Para retirarlo: borrar `core/dev/`, el `<app-dev-access-button>` del login, el uso de `DevAccess` en
`CurrentUser` y en los `*.providers.ts`, y volver a `authGuard` en `app.routes.ts`.

## Estilos

Todos los componentes se estilizan con Tailwind CSS usando los tokens del tema
(`bg-surface`, `text-ink`, `text-muted`, `border-border`, `text-accent`, etc.) definidos en
`tailwind.config.js` y `src/styles/_variables.scss`. No se usan colores ni estilos en línea arbitrarios.

Primitivas globales en `styles.scss` (`@layer components`): `.surface-card`, `.input-control`,
`.btn-primary`, `.btn-ghost`, además de `.card-glow` y `.real` (entrada escalonada tras un esqueleto).

Los colores con transparencia (`bg-primary/15`) **no** se generan con los tokens actuales (son
`var(--…)` opacos); para fondos tenues se usan los tokens sólidos `primary-soft`, `success-soft`,
`warning-soft` y `danger-soft`.

## Restricciones de importación

Las siguientes reglas de importación garantizan la separación de responsabilidades y evitan dependencias circulares:

| Capa        | Puede importar de                                  | NO puede importar de                    |
| ----------- | -------------------------------------------------- | --------------------------------------- |
| `core/`     | Dependencias externas (Angular, RxJS, NgRx)        | `features/`, `shared/`, `layouts/`      |
| `shared/`   | Dependencias externas (Angular, Material, Tailwind)| `core/`, `features/`, `layouts/`        |
| `features/` | `core/`, `shared/`, dependencias externas          | `layouts/`, otros features              |
| `layouts/`  | `core/`, `shared/`, dependencias externas          | `features/`                             |

### Reglas adicionales

- Un feature **no** puede importar de otro feature directamente.
- Los componentes de negocio viven dentro de su feature, no en `shared/`.
- Los componentes reutilizables van en `shared/ui/`.

## Atomic Design para UI

Los componentes reutilizables se organizan en estos niveles:

- **Atoms:** Componentes básicos e indivisibles (button, input, select).
- **Molecules:** Combinaciones de atoms con lógica propia (search-box, confirm-dialog).
- **Organisms:** Componentes complejos que combinan molecules y atoms (data-table, sidebar).
- **Templates:** Estructuras de página reutilizables que componen organismos.

Los organismos son **presentacionales**: reciben datos por inputs y emiten eventos; no conocen ninguna feature.

La estructura física de `shared/ui/` agrupa cada componente en su propia
carpeta (`atoms/button/`, `molecules/form-field/`, etc.). Cada carpeta puede
contener el componente standalone, su template, estilos y pruebas. Las
subcarpetas iniciales sirven como puntos de extensión y no obligan a crear
componentes antes de necesitarlos; las carpetas existentes se conservan.

La dirección de composición es estricta:

```text
atoms → molecules → organisms → templates
```

Las páginas reales de una aplicación pertenecen a `features/`, mientras que
los shells de navegación pertenecen a `layouts/`. `shared/ui/templates/`
solo contiene estructuras visuales reutilizables y no debe acceder a stores,
servicios ni modelos de negocio.

## Flujo de datos

```
Componente → Store → Servicio → HTTP → Microservicio
    ↑                                       │
    └────── Signal (estado reactivo) ←──────┘
```

1. El componente invoca un método del store.
2. El store llama al servicio correspondiente.
3. El servicio realiza la petición HTTP (con interceptors).
4. La respuesta actualiza el estado del store.
5. Los signals del store notifican al componente automáticamente.

Las respuestas de la API siguen el sobre `ApiResponse<T>` de `core/http/api-response.model.ts`.

## Reactive Forms

Todos los formularios usan Reactive Forms (`FormGroup`, `FormControl`) con validación programática. No se usan Template-driven Forms.

## Adaptación al backend publicado

Los DTO wire describen las respuestas directas de Quarkus y permanecen separados del modelo visual español. `profile.mapper.ts` traduce datos de formulario y avatares. AuthStore usa /session como autoridad para perfil pendiente/completo, y los guards ofrecen reintento si la API no está disponible.

El interceptor usa origen y prefijo REST exactos para Bearer. El contexto de logout desactiva recuperación de 401; la limpieza local no depende del éxito de la invalidación remota. La landing consulta readiness y demo como capacidades independientes, sin cifras simuladas en el modo real.

La configuración pública activa se documenta en [INTEGRATION.md](INTEGRATION.md).
