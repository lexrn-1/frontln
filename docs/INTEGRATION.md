# Conexión pública y local

El build normal usa API `https://api.5-253-232-179.sslip.io/api/v1` y Socket.IO `https://api.5-253-232-179.sslip.io` con path `/socket.io/`. Readiness es `/q/health/ready`, no una base de recursos. El frontend Vercel `https://frontln.vercel.app` debe estar en APP_ALLOWED_ORIGINS junto a los localhost autorizados; una variable definida reemplaza toda la lista. Configuración pública en runtime-config.public.ts.

La entrega incorpora salas, chat e historial y WebRTC; las versiones nuevas aún deben publicarse. El gateway distingue Socket.IO 9092, historial HTTP de realtime 8080 y API 8080. No configurar dos routers raíz con igual host/path. Consultar [contratos y pruebas vigentes](COLLABORATION.md), y compose.gateway.yaml/docs/dokploy.md del backend para las prioridades.

El build integration es exclusivamente local con Auth emulado, proyecto demo-app-meet y backend HTTP local. No publicarlo. El build de producción mantiene HTTPS y Firebase real. El despliegue, índices productivos, firma Firebase real, Traefik/WSS y TURN entre redes siguen pendientes de evidencia externa. Las capturas anteriores de pruebas públicas describen únicamente su fecha, no el estado actual del servidor.
