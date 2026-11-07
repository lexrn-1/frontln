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
├── http/          # Contratos HTTP comunes (ApiResponse<T>, errores)
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
├── services/      # AuthService: peticiones HTTP a /api/auth
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
