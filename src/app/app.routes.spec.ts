import { isPlausibleRoomId } from './core/rooms/room-code';
import { privateRouteGuard } from './core/dev/dev-access';
import { guestGuard, incompleteProfileGuard } from './core/auth/guards/auth.guards';
import { routes } from './app.routes';

describe('route table', () => {
  const shell = routes.find((r) => r.path === '' && r.children)!;
  const childPaths = shell.children!.map((c) => c.path);

  it('keeps the public and auth routes with their guards', () => {
    expect(routes.find((r) => r.path === '')?.canActivate).toBeUndefined();
    expect(routes.find((r) => r.path === 'login')?.canActivate).toEqual([guestGuard]);
    expect(routes.find((r) => r.path === 'registro')?.canActivate).toEqual([guestGuard]);
    expect(routes.find((r) => r.path === 'completar-perfil')?.canActivate).toEqual([incompleteProfileGuard]);
  });

  it('protects every private route', () => {
    expect(shell.canActivate).toEqual([privateRouteGuard]);
    ['dashboard', 'explorar', 'chats', 'chats/:roomId', 'perfil', 'configuracion'].forEach((p) =>
      expect(childPaths).toContain(p)
    );
    expect(routes.find((r) => r.path === 'salas/:id')?.canActivate).toEqual([privateRouteGuard]);
  });

  it('ends with a 404 page instead of redirecting silently', () => {
    const last = routes.at(-1)!;
    expect(last.path).toBe('**');
    expect(last.redirectTo).toBeUndefined();
    expect(last.loadComponent).toBeDefined();
  });

  it('rejects malformed room ids before calling the API', () => {
    expect(isPlausibleRoomId('SR-84K2')).toBeFalse();
    expect(isPlausibleRoomId('40b4c52b-ab39-4f52-a897-322a175eaa97')).toBeTrue();
    expect(isPlausibleRoomId('')).toBeFalse();
    expect(isPlausibleRoomId('../etc')).toBeFalse();
    expect(isPlausibleRoomId('a b')).toBeFalse();
    expect(isPlausibleRoomId('x'.repeat(65))).toBeFalse();
  });
});
