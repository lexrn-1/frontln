# Pendientes de integración

Salas, membresías, chat persistente, historial paginado, presencia y señalización ya tienen contratos implementados. Ver [guía vigente](COLLABORATION.md).

Pendientes externos: publicar ambos backends y frontend, índices/IAM y tokens con firma real Firebase, verificar CORS desde Vercel y rutas Traefik/WSS, TURN con credenciales válidas, dispositivos físicos/redes distintas y medición de latencia bajo carga real.

Fuera del alcance acordado: catálogo público, horarios/materias/categorías, adjuntos, tablero, no leídos, edición/borrado de perfil. No activar los adaptadores de esas funcionalidades ni añadir contratos inventados. La presencia local exige una sola réplica de realtime; para escalar hace falta coordinación entre instancias.
