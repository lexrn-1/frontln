# Evidencia de conexión pública — 14 de noviembre de 2026

## Archivos preparados localmente

Frontend: `frontln`, rama develop. Backend/documentación: rama master existente; no se cambió de rama ni se hicieron commits o push. Se preservó la eliminación previa del enlace `frontln` en el repositorio backend.

- Configuración activa HTTPS: api.5-253-232-179.sslip.io; API /api/v1; readiness /q/health/ready; Socket.IO /socket.io/.
- Firebase Auth real y useMocks=false. Sin cambios de dependencias ni del lockfile.
- Contratos HTTP directos, adaptación de campos/avatares, sesión de servidor, errores normalizados, logout y recuperación.
- Readiness/demo separados y sin Bearer; dato demo ausente no inventa estadísticas.

## Resultados locales

- pnpm install --frozen-lockfile: correcto (pnpm 10.11.0).
- pnpm run build: correcto, Node 22, bundle de producción en dist/frontmeet/browser.
- Jasmine/Karma con ChromeHeadless 141: **24 pruebas aprobadas**, cero fallos.
- Casos: contratos y cuerpos HTTP, perfil/avatar, sesión pendiente/completa, guards, conflicto/reintento con misma identidad Firebase, recuperación 503, timeout de sesión, límites del interceptor Bearer, reintento 401, logout sin recursión y respuesta tardía después de logout, readiness/demo, validaciones y errores.
- Compose base + compose.gateway.yaml: configuración válida. Router API puerto 8080/prioridad 100; Socket.IO puerto 9092/prioridad 200; sin StripPrefix. No se aplicó al servidor.

## Comprobaciones públicas de solo lectura

```json
{
  "/q/health/ready": {
    "http": 200,
    "status": "UP"
  },
  "/api/v1/session": {
    "http": 401
  },
  "/socket.io/?EIO=4&transport=polling": {
    "http": 404
  },
  "preflight": {
    "http": 200,
    "allowOrigin": "https://frontln.vercel.app"
  }
}
```

La verificación de navegador sirvió los archivos compilados locales mediante interceptación del origen https://frontln.vercel.app y permitió las peticiones reales HTTPS a la API pública. Confirmó health/demo, ausencia de Bearer en rutas públicas, validación de username/correo, redirección de dashboard sin sesión y ausencia de excepciones JavaScript. Analytics se bloqueó durante esta prueba.

Esto no constituye un despliegue Vercel. No se iniciaron sesiones reales, se crearon usuarios de producción ni se modificaron datos de Firestore.

## Pendientes externos

- Publicar el frontend actualizado en Vercel.
- Aplicar las rutas de Dokploy: /socket.io/ a realtime y resto a API; la ruta pública Socket.IO todavía devuelve 404.
- Verificar polling/Upgrade y login/correo/Google con una cuenta autorizada después del despliegue.
- Validar red, entrypoint HTTPS y resolver de certificados reales antes de activar el override; no mantener routers duplicados de la UI.
