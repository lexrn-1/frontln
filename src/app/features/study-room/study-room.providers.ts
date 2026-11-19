import { Provider } from '@angular/core';

import { runtimeConfig } from '../../core/config/runtime-config';
import { isDevAccessActive } from '../../core/dev/dev-access';
import { BoardService, HttpBoardService } from './board/services/board.service';
import { MockBoardService } from './board/services/mock-board.service';
import { MockStudyRoomService } from './mocks/mock-study-room.service';
import { RoomMediaStateService } from './services/room-media-state.service';
import { MediaService } from './services/media.service';
import {
  NotConnectedPeerConnectionsService,
  WebRtcPeerConnectionsService,
  PeerConnectionsService,
} from './services/peer-connections.service';
import { RealtimeStudyRoomService, StudyRoomService } from './services/study-room.service';

/** Se registra en la ruta `/salas/:id`. Mocks con `useMocks` o acceso de desarrollo; adaptadores pendientes si no. */
export function provideStudyRoom(): Provider[] {
  const useMock = runtimeConfig.useMocks || isDevAccessActive();
  return [
    {
      provide: StudyRoomService,
      useClass: useMock ? MockStudyRoomService : RealtimeStudyRoomService,
    },
    {
      provide: BoardService,
      useClass: useMock ? MockBoardService : HttpBoardService,
    },
    {
      provide: PeerConnectionsService,
      useClass: useMock ? NotConnectedPeerConnectionsService : WebRtcPeerConnectionsService,
    },
    RoomMediaStateService,
    MediaService,
  ];
}
