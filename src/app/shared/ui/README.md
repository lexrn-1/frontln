# Shared UI y Atomic Design

Esta carpeta contiene únicamente componentes visuales reutilizables y
presentacionales. La jerarquía de Atomic Design se mantiene separada de las
features para evitar dependencias circulares.

```text
ui/
├── atoms/       # Piezas indivisibles: button, input, icon, spinner
├── molecules/   # Combinaciones pequeñas: form-field, search-box
├── organisms/   # Secciones completas: header, sidebar, data-table
└── templates/   # Estructuras de página sin datos de una feature concreta
```

## Reglas

- Un componente solo puede importar componentes de su mismo nivel o de niveles
  inferiores.
- Los atoms no conocen molecules, organisms, templates ni features.
- Los componentes de esta carpeta reciben datos por `input()` y notifican
  acciones mediante `output()`.
- La lógica de negocio, stores, servicios y modelos de una feature viven en
  `features/<feature>/`, no aquí.
- Cada componente nuevo debe tener su propia carpeta con el componente, estilos
  locales y pruebas cuando corresponda.

Las páginas concretas pertenecen a `features/` y los shells de navegación
pertenecen a `layouts/`; no se crean páginas de negocio dentro de `shared/ui`.
