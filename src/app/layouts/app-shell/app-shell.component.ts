import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, startWith } from 'rxjs';

import { Announcer } from '../../core/layout/announcer.service';
import { ChatStore } from '../../core/chat/store/chat.store';
import { CurrentUser } from '../../core/auth/store/current-user.store';
import { AppError } from '../../core/http/app-error';
import { RoomDialogs } from '../../core/layout/room-dialogs.service';
import { NotificationsStore } from '../../core/notifications/notifications.store';
import { ROOM_CATEGORIES, ROOM_CATEGORY_LABELS, RoomCategory } from '../../core/rooms/models/room.models';
import { isValidRoomCode, normalizeRoomCode } from '../../core/rooms/room-code';
import { RoomsStore } from '../../core/rooms/store/rooms.store';
import { StudyStatsStore } from '../../core/study/store/study-stats.store';
import { ConfirmDialogComponent } from '../../shared/ui/molecules/confirm-dialog/confirm-dialog.component';
import { ToastComponent } from '../../shared/ui/molecules/toast/toast.component';
import {
  CreateRoomDialogComponent,
  RoomFormValue,
} from '../../shared/ui/organisms/create-room-dialog/create-room-dialog.component';
import { JoinRoomDialogComponent } from '../../shared/ui/organisms/join-room-dialog/join-room-dialog.component';
import { SidebarComponent, SidebarSection } from '../../shared/ui/organisms/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/ui/organisms/topbar/topbar.component';

/** Datos de cabecera que cada ruta hija declara en `data.header`. */
export interface ShellHeaderData {
  title: string;
  subtitle?: string;
  /** Si es `true`, el título se sustituye por "Hola, {nombre}". */
  greeting?: boolean;
}

/**
 * Shell de las pantallas privadas con navegación (inicio, explorar, perfil, configuración):
 * barra lateral, cabecera, y los modales Crear/Unirse que abren las pantallas vía `RoomDialogs`.
 * La sala de estudio queda fuera del shell (pantalla completa).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    CreateRoomDialogComponent,
    JoinRoomDialogComponent,
    ToastComponent,
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      @if (navOpen()) {
        <div
          class="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          (click)="navOpen.set(false)"
        ></div>
      }
      <aside
        class="fixed inset-y-0 left-0 z-40 w-[300px] border-r border-border bg-canvas transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0"
        [class]="navOpen() ? 'translate-x-0' : 'max-lg:-translate-x-full max-lg:invisible'"
        aria-label="Menú lateral"
      >
        <app-sidebar
          [sections]="sections()"
          [streakTitle]="streakTitle()"
          [streakText]="streakText()"
          (logout)="logout()"
          (navigated)="navOpen.set(false)"
        />
      </aside>

      <div class="min-w-0">
        @if (user.isDemo()) {
          <p class="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning" role="status">
            <span class="sm:hidden">Modo demostración · sin backend</span
            ><span class="hidden sm:inline"
              >Acceso de desarrollo activo · datos de demostración, sin conexión con el backend</span
            >
          </p>
        }
        <app-topbar
          [title]="headerTitle()"
          [subtitle]="header().subtitle ?? null"
          [userName]="user.fullName()"
          [avatarTone]="user.profile()?.avatar ?? 'peach'"
          [unreadCount]="notifications.unreadCount()"
          [notifications]="notificationViews()"
          [menuOpen]="navOpen()"
          (menuToggle)="navOpen.set(!navOpen())"
        />
        <main id="contenido" tabindex="-1" class="px-4 pb-16 pt-8 outline-none sm:px-12">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-create-room-dialog
      [nameOnly]="true"
      [open]="dialogs.createOpen()"
      [pending]="createPending()"
      [error]="createError()"
      [categories]="categories"
      (submitted)="createRoom($event)"
      (closed)="closeCreate()"
    />
    <app-create-room-dialog
      [open]="!!dialogs.edit()"
      heading="Editar nombre de la sala"
      submitLabel="Guardar cambios"
      [initialName]="dialogs.edit()?.name ?? ''"
      [nameOnly]="true"
      [pending]="editPending()"
      [error]="editError()"
      (submitted)="editRoom($event.name)"
      (closed)="closeEdit()"
    />
    <app-join-room-dialog
      [open]="dialogs.joinOpen()"
      [pending]="joinPending()"
      [error]="joinError()"
      [isValidCode]="isValidCode"
      [hint]="joinHint"
      (submitted)="joinRoom($event)"
      (closed)="closeJoin()"
    />
    <app-confirm-dialog
      [open]="!!dialogs.removal()"
      heading="Eliminar sala"
      [message]="'Vas a eliminar «' + (dialogs.removal()?.name ?? '') + '». Esta acción no se puede deshacer.'"
      confirmLabel="Eliminar sala"
      [pending]="removePending()"
      [error]="removeError()"
      (confirmed)="removeRoom()"
      (closed)="closeRemove()"
    />
    <app-toast [message]="announcer.message()" [tone]="announcer.tone()" />
  `,
})
export class AppShellComponent implements OnInit {
  protected readonly user = inject(CurrentUser);
  protected readonly dialogs = inject(RoomDialogs);
  protected readonly notifications = inject(NotificationsStore);
  protected readonly announcer = inject(Announcer);
  private readonly rooms = inject(RoomsStore);
  private readonly chats = inject(ChatStore);
  private readonly stats = inject(StudyStatsStore);
  private readonly router = inject(Router);

  protected readonly navOpen = signal(false);
  protected readonly createPending = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly joinPending = signal(false);
  protected readonly joinError = signal<string | null>(null);
  protected readonly editPending = signal(false);
  protected readonly editError = signal<string | null>(null);
  protected readonly categories = ROOM_CATEGORIES.map((value) => ({
    value,
    label: ROOM_CATEGORY_LABELS[value],
  }));
  protected readonly removePending = signal(false);
  protected readonly removeError = signal<string | null>(null);
  protected readonly isValidCode = isValidRoomCode;
  protected readonly joinHint = this.rooms.joinHint;

  protected readonly header = signal<ShellHeaderData>({ title: '' });
  protected readonly headerTitle = computed(() => {
    const h = this.header();
    return h.greeting ? `Hola, ${this.user.firstName()}` : h.title;
  });

  protected readonly sections = computed<SidebarSection[]>(() => {
    const live = this.rooms.liveRoom();
    const sections: SidebarSection[] = [
      {
        title: 'Mi espacio',
        items: [
          { label: 'Inicio', icon: 'home', route: '/dashboard' },
          { label: 'Chats', icon: 'forum', route: '/chats', badge: 0 },
          { label: 'Mi perfil', icon: 'person', route: '/perfil' },
          { label: 'Configuración', icon: 'settings', route: '/configuracion' },
        ],
      },
    ];
    if (live) {
      sections.push({
        title: 'Estudio',
        items: [
          {
            label: 'Sala en curso',
            icon: 'videocam',
            route: `/salas/${live.id}`,
            live: true,
          },
        ],
      });
    }
    return sections;
  });

  protected readonly streakTitle = computed(() => {
    const days = this.stats.stats()?.streakDays;
    return days ? `Racha de ${days} días` : null;
  });
  protected readonly streakText = computed(() => `¡Sigue así, ${this.user.firstName()}!`);

  protected readonly notificationViews = computed(() =>
    this.notifications.items().map((n) => ({
      id: n.id,
      title: n.title,
      detail: n.detail,
      read: n.read,
      when: new Date(n.createdAt).toLocaleString('es', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    }))
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe(() => this.header.set(this.readHeader(this.router.routerState.snapshot.root)));
  }

  ngOnInit(): void {
    void this.rooms.loadMine();
    void this.chats.loadConversations();
    if (this.rooms.isDemo) void this.stats.load();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.navOpen.set(false);
  }

  protected logout(): void {
    void this.user.logout();
  }

  protected closeCreate(): void {
    this.dialogs.createOpen.set(false);
    this.createError.set(null);
  }

  protected closeJoin(): void {
    this.dialogs.joinOpen.set(false);
    this.joinError.set(null);
  }

  protected closeEdit(): void {
    this.dialogs.edit.set(null);
    this.editError.set(null);
  }

  protected async editRoom(name: string): Promise<void> {
    const target = this.dialogs.edit();
    if (!target) return;
    this.editPending.set(true);
    this.editError.set(null);
    try {
      await this.rooms.update(target.id, { name });
      this.closeEdit();
      this.announcer.announce('Nombre de la sala actualizado');
    } catch (error) {
      this.editError.set(AppError.from(error).message);
    } finally {
      this.editPending.set(false);
    }
  }

  protected closeRemove(): void {
    this.dialogs.removal.set(null);
    this.removeError.set(null);
  }

  protected async removeRoom(): Promise<void> {
    const target = this.dialogs.removal();
    if (!target) return;
    this.removePending.set(true);
    this.removeError.set(null);
    try {
      await this.rooms.remove(target.id);
      this.closeRemove();
      this.announcer.announce(`Sala «${target.name}» eliminada`);
    } catch (error) {
      this.removeError.set(AppError.from(error).message);
    } finally {
      this.removePending.set(false);
    }
  }

  protected async createRoom(value: RoomFormValue): Promise<void> {
    this.createPending.set(true);
    this.createError.set(null);
    try {
      const room = await this.rooms.create({
        name: value.name,
        category: value.category as RoomCategory,
        schedule: value.schedule,
      });
      this.closeCreate();
      await this.router.navigate(['/salas', room.id]);
    } catch (error) {
      this.createError.set(AppError.from(error).message);
    } finally {
      this.createPending.set(false);
    }
  }

  protected async joinRoom(code: string): Promise<void> {
    this.joinPending.set(true);
    this.joinError.set(null);
    try {
      const room = await this.rooms.join(normalizeRoomCode(code));
      this.closeJoin();
      await this.router.navigate(['/salas', room.id]);
    } catch (error) {
      this.joinError.set(AppError.from(error).message);
    } finally {
      this.joinPending.set(false);
    }
  }

  private readHeader(snapshot: ActivatedRouteSnapshot): ShellHeaderData {
    let node: ActivatedRouteSnapshot | null = snapshot;
    let found: ShellHeaderData = { title: '' };
    while (node) {
      if (node.data['header']) found = node.data['header'] as ShellHeaderData;
      node = node.firstChild;
    }
    return found;
  }
}
