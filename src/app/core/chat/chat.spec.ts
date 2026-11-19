import { AuthStore } from '../auth/store/auth.store';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CurrentUser } from '../auth/store/current-user.store';
import { runtimeConfig } from '../config/runtime-config';
import { FilesService } from '../files/files.service';
import { MockFilesService } from '../files/mock-files.service';
import { REALTIME_EVENTS, RealtimeService, NotConnectedRealtimeService } from '../realtime/realtime.service';
import { MockRoomsService } from '../rooms/services/mock-rooms.service';
import { RoomsService } from '../rooms/services/rooms.service';
import { MockChatService } from './mocks/mock-chat.service';
import { toConversation, toMessage, toMessagePage } from './models/chat.mapper';
import { ChatService } from './services/chat.service';
import { ChatStore } from './store/chat.store';

describe('ChatStore: una sola conversación para las dos interfaces', () => {
  let store: ChatStore;

  beforeEach(() => {
    runtimeConfig.mockLatencyMs = 0;
    TestBed.configureTestingModule({
      providers: [
        ChatStore,
        { provide: ChatService, useClass: MockChatService },
        { provide: RoomsService, useClass: MockRoomsService },
        { provide: FilesService, useClass: MockFilesService },
        { provide: CurrentUser, useValue: { profile: signal(null) } },
        { provide: RealtimeService, useClass: NotConnectedRealtimeService },
        {
          provide: AuthStore,
          useValue: { registerTeardown: () => () => undefined },
        },
      ],
    });
    store = TestBed.inject(ChatStore);
  });

  afterAll(() => (runtimeConfig.mockLatencyMs = 650));

  it('lists conversations by recent activity with unread counts', async () => {
    await store.loadConversations();
    const list = store.conversations();
    expect(list.map((c) => c.roomId)).toEqual(['SR-3D9F', 'SR-8462', 'SR-5K1M']);
    expect(store.unreadTotal()).toBe(2);
    expect(list[0].lastMessage?.text).toContain('sala ahora');
  });

  it('loads the latest page, older pages on demand and keeps chronological order', async () => {
    await store.open('SR-3D9F');
    const first = store.chatOf('SR-3D9F');
    expect(first.messages.length).toBe(runtimeConfig.chat.pageSize);
    expect(first.nextCursor).toBeTruthy();
    await store.loadOlder('SR-3D9F');
    const all = store.chatOf('SR-3D9F');
    expect(all.messages.length).toBe(46);
    expect(all.nextCursor).toBeNull();
    const times = all.messages.map((m) => m.sentAt);
    expect([...times].sort()).toEqual(times);
  });

  it('a message sent from one interface is visible from the other (same history)', async () => {
    await store.loadConversations();
    await store.open('SR-8462'); // "chat de la sala"
    expect(await store.send('SR-8462', { text: '  Hola desde Meet  ', files: [] })).toBeTrue();
    // "apartado Chats": mismo store, otra vista
    expect(store.chatOf('SR-8462').messages.at(-1)?.text).toBe('Hola desde Meet');
    expect(store.conversations()[0].roomId).toBe('SR-8462');
    expect(store.conversations()[0].lastMessage?.text).toBe('Hola desde Meet');
    // otra instancia de lectura por el servicio confirma que se persistió fuera del store
    TestBed.inject(ChatService)
      .listMessages('SR-8462', { limit: 50 })
      .subscribe((page) => expect(page.messages.at(-1)?.text).toBe('Hola desde Meet'));
  });

  it('marks messages as read when the conversation is opened', async () => {
    await store.loadConversations();
    expect(store.unreadTotal()).toBe(2);
    await store.open('SR-3D9F');
    expect(store.unreadTotal()).toBe(0);
  });

  it('rejects empty messages and unsupported attachments, preserving text sending', async () => {
    await store.open('SR-5K1M');
    expect(await store.send('SR-5K1M', { text: '   ', files: [] })).toBeFalse();
    const file = new File(['contenido'], 'apuntes.txt', { type: 'text/plain' });
    expect(await store.send('SR-5K1M', { text: 'Apuntes', files: [file] })).toBeFalse();
    expect(await store.send('SR-5K1M', { text: 'Solo texto', files: [] })).toBeTrue();
  });

  it('denies the conversation of a room the user does not belong to', async () => {
    expect(await store.checkAccess('SR-7QX2')).toContain('No perteneces');
    expect(await store.checkAccess('SR-8462')).toBeNull();
    expect(await store.checkAccess('SR-ZZZZ')).toBeTruthy();
  });

  it('the realtime adapter is not connected and does not fake events', () => {
    const rt = TestBed.inject(RealtimeService);
    expect(rt.status()).toBe('unavailable');
    let events = 0;
    rt.events$.subscribe(() => events++);
    expect(events).toBe(0);
    expect(REALTIME_EVENTS.messageCreated).toBe('message.created');
  });
});

describe('chat mappers (propuesta de contrato)', () => {
  const dto = {
    id: 'm1',
    roomId: 'R',
    sender: { uid: 'u1', displayName: 'Ana Ruiz' },
    text: 'hola',
    attachments: [{ id: 'f', fileName: 'a.pdf', size: 5, contentType: 'application/pdf' }],
    createdAt: '2026-01-01T10:00:00Z',
  };

  it('maps a message and flags the own ones', () => {
    const m = toMessage(dto, 'u1');
    expect(m.own).toBeTrue();
    expect(m.authorInitial).toBe('A');
    expect(m.attachments[0]).toEqual({
      id: 'f',
      name: 'a.pdf',
      size: 5,
      mimeType: 'application/pdf',
    });
    expect(toMessage(dto, 'other').own).toBeFalse();
  });

  it('orders pages chronologically and builds conversation previews', () => {
    const page = toMessagePage(
      {
        items: [{ ...dto, id: 'm2', createdAt: '2026-01-01T11:00:00Z' }, dto],
        nextCursor: 'c',
      },
      null
    );
    expect(page.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    const conv = toConversation(
      {
        roomId: 'R',
        roomName: 'Sala',
        participantCount: 3,
        unreadCount: 2,
        lastActivityAt: null,
        lastMessage: dto,
      },
      'u1'
    );
    expect(conv.lastMessage?.authorName).toBe('Tú');
    expect(conv.lastMessage?.hasAttachments).toBeTrue();
    expect(conv.lastActivityAt).toBe(dto.createdAt);
  });
});
