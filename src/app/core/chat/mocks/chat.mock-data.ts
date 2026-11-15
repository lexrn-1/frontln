import { ChatMessage } from '../models/chat.models';

/** DATOS DE DEMOSTRACIÓN del chat: conversaciones inventadas para las salas de `rooms.mock.ts`. */
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

function msg(roomId: string, n: number, who: 'Lucía' | 'Mateo' | 'Ana' | 'Tú', text: string, minutesAgo: number): ChatMessage {
  const tones = { Lucía: 'peach', Mateo: 'mint', Ana: 'sky', Tú: 'rose' } as const;
  return {
    id: `${roomId}-m${n}`, roomId, authorId: who === 'Tú' ? 'me' : who.toLowerCase(), authorName: who,
    authorInitial: who.charAt(0), tone: tones[who], text, attachments: [], sentAt: ago(minutesAgo), own: who === 'Tú'
  };
}

export function seedMessages(): Map<string, ChatMessage[]> {
  const map = new Map<string, ChatMessage[]>();
  map.set('SR-8462', [
    msg('SR-8462', 1, 'Lucía', '¿Repasamos primero integración por partes?', 200),
    msg('SR-8462', 2, 'Mateo', 'Sí, comparto mis apuntes en un minuto.', 198),
    msg('SR-8462', 3, 'Tú', 'Perfecto, llevo los ejercicios del 5 al 10.', 190)
  ]);
  // Historial largo (>30) para ver la paginación y "cargar anteriores".
  const long: ChatMessage[] = [];
  const phrases = ['¿Alguien tiene el resumen del ciclo de Krebs?', 'Yo lo subo en un rato.', 'Gracias, lo reviso.', 'Repasemos la glucólisis a las 18:00.', 'Me confirman si llegan puntuales.'];
  const authors = ['Lucía', 'Mateo', 'Ana', 'Tú'] as const;
  for (let i = 0; i < 44; i++) long.push(msg('SR-3D9F', i + 1, authors[i % 4], `${phrases[i % phrases.length]} (${i + 1})`, 600 - i * 12));
  long.push(msg('SR-3D9F', 45, 'Ana', 'Perfecto, tengo una duda del ejercicio 7.', 6));
  long.push(msg('SR-3D9F', 46, 'Mateo', '¿Lo vemos en la sala ahora?', 3));
  map.set('SR-3D9F', long);
  map.set('SR-5K1M', [msg('SR-5K1M', 1, 'Tú', 'Dejo el caso práctico para mañana.', 1500)]);
  return map;
}

export function seedUnread(): Map<string, number> {
  return new Map([['SR-3D9F', 2], ['SR-8462', 0], ['SR-5K1M', 0]]);
}
