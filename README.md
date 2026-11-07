# FrontMeet (Frontend)

Aplicación Angular 17 standalone (SPA) construida con Tailwind CSS, Angular Material y SCSS,
siguiendo `core` / `shared` / `features` / `layouts` y Atomic Design. El flujo es
página → store reactivo (signals) → servicio HTTP → API REST.

La arquitectura y las reglas de importación están en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Uso

1. Ejecuta `npm install`.
2. Ejecuta `npm start`.
3. Abre `http://localhost:4200`.

## Backend

Apunta `runtimeConfig.apiUrl` en `src/app/core/config/runtime-config.ts` a la URL de la API.

## Despliegue

- Build de producción: `npm run build` (salida en `dist/frontmeet`).
- Pensado para desplegar en Vercel (`vercel.json`). Vercel instala con pnpm y
  `--frozen-lockfile`: al cambiar dependencias sincroniza `pnpm-lock.yaml` y `package-lock.json`.
  Mantén `.npmrc` (`node-linker=hoisted`) para Angular Material.

## Pruebas unitarias

Ejecuta `npm test` para correr los archivos `*.spec.ts` con Jasmine y Karma en
ChromeHeadless. Se necesita Chrome o Chromium instalado (o define `CHROME_BIN`).
