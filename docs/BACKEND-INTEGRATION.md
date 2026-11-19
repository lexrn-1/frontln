# Contratos backend integrados

La referencia vigente es [colaboración](COLLABORATION.md), complementada por docs/salas-chat.md y docs/integracion-cliente.md del backend. Frontend implementa los adaptadores HTTP de salas y configuración ICE, historial HTTP de realtime, Socket.IO v1 y WebRTC simple-peer.

Todos los recursos privados usan Firebase ID token y perfil completo. API deriva uid, propietario y roles; realtime deriva remitente y autoriza cada destino por sala. No hay REST /chats o /leave. Los mensajes salen por chat:send y el historial entra por GET /rooms/{id}/messages; cache local se mezcla por ID/timestamp y se limpia al cambiar sesión.

Los campos de sala implementados son id, name, ownerUid, role, status y timestamps. La UI mínima no envía materia, categoría, recuento o horario; catálogo, adjuntos, tablero y no leídos persistentes quedan fuera de alcance. Ver [pendientes](BACKEND-PENDING.md).
