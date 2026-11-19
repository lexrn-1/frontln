import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { AuthStore } from '../auth/store/auth.store';
import { CurrentUser } from '../auth/store/current-user.store';
import { FilesService } from '../files/files.service';
import { RealtimeService, RealtimeEvent } from '../realtime/realtime.service';
import { MessagePage } from './models/chat.models';
import { toMessage } from './models/chat.mapper';
import { ChatService } from './services/chat.service';
import { ChatStore } from './store/chat.store';

describe('Chat recovery and session boundaries', () => {
  let teardown: () => void, store: ChatStore, events: Subject<RealtimeEvent>, initial: Subject<MessagePage>, api: any;
  const dto = (id: string, time: string) => ({
    id,
    roomId: 'room',
    text: id,
    sender: { uid: 'u', displayName: 'Ana' },
    createdAt: `2026-11-19T12:00:${time}.000000000Z`,
    cursor: `cursor-${id}`,
  });
  beforeEach(() => {
    events = new Subject();
    initial = new Subject();
    api = {
      isDemo: false,
      listConversations: () => of([]),
      markRead: () => of(undefined),
      listMessages: jasmine
        .createSpy()
        .and.callFake((_room: string, query: any) => (query.after ? of({ messages: [], nextCursor: null }) : initial)),
    };
    TestBed.configureTestingModule({
      providers: [
        ChatStore,
        { provide: ChatService, useValue: api },
        { provide: FilesService, useValue: {} },
        { provide: CurrentUser, useValue: { profile: signal({ uid: 'u' }) } },
        {
          provide: AuthStore,
          useValue: { registerTeardown: (fn: () => void) => (teardown = fn) },
        },
        {
          provide: RealtimeService,
          useValue: {
            events$: events,
            enter: () => Promise.resolve({}),
            leaveRoom: () => undefined,
          },
        },
      ],
    });
    store = TestBed.inject(ChatStore);
  });
  it('merges a live message arriving during history, deduplicates and recovers after the last cursor', async () => {
    const opening = store.open('room');
    await Promise.resolve();
    await Promise.resolve();
    events.next({
      type: 'message.created',
      roomId: 'room',
      message: dto('new', '02'),
    });
    initial.next({
      messages: [toMessage(dto('old', '01'), 'u')],
      nextCursor: null,
    });
    initial.complete();
    await opening;
    events.next({
      type: 'message.created',
      roomId: 'room',
      message: dto('new', '02'),
    });
    expect(store.chatOf('room').messages.map((m) => m.id)).toEqual(['old', 'new']);
    expect(api.listMessages).toHaveBeenCalledWith('room', {
      limit: 100,
      after: 'cursor-new',
    });
  });
  it('discards a pending history response after logout', async () => {
    const opening = store.open('room');
    await Promise.resolve();
    await Promise.resolve();
    teardown();
    initial.next({
      messages: [toMessage(dto('private', '01'), 'u')],
      nextCursor: null,
    });
    initial.complete();
    await opening;
    expect(store.chatOf('room').messages).toEqual([]);
    expect(store.chatOf('room').state).toBe('idle');
  });
});
