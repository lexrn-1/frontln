import { test, expect, chromium, Page } from '@playwright/test';
const api = 'http://localhost:20880/api/v1';
const password = 'AudioTests123!';
async function account(name: string) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const email = `audio-${id}@example.test`;
  const signed = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  expect(signed.status).toBe(200);
  const user = await signed.json();
  const profile = await fetch(`${api}/me/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName: 'Audio', lastName: name, username: `a${id}`, avatar: 'avatar-1' }),
  });
  expect(profile.status).toBe(200);
  return { ...user, email };
}
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function audioPackets(page: Page): Promise<number> {
  return page.evaluate(async () => {
    let bytes = 0;
    for (const peer of (window as any).audioTestPeers as RTCPeerConnection[])
      if (peer.connectionState === 'connected')
        for (const stat of (await peer.getStats()).values())
          if (stat.type === 'inbound-rtp' && stat.kind === 'audio') bytes += stat.bytesReceived ?? 0;
    return bytes;
  });
}

test('historial por Socket.IO con REST 404 y audio activado después de entrar/reconectar', async () => {
  // Do not bypass autoplay policy: playback must work after a real page gesture or expose its button.
  const browser = await chromium.launch({
    executablePath: process.env['E2E_CHROMIUM'],
    args: [
      '--no-sandbox',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=document-user-activation-required',
    ],
  });
  const users = await Promise.all([account('Uno'), account('Dos')]);
  const contexts = [];
  const pages: Page[] = [];
  const errors: string[] = [];
  let roomId = '';
  try {
    const created = await fetch(`${api}/rooms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users[0].idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Late audio test' }),
    });
    expect(created.status).toBe(201);
    roomId = (await created.json()).id;
    let history404 = 0;
    for (let i = 0; i < 2; i++) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        permissions: ['microphone', 'camera'],
      });
      contexts.push(context);
      await context.addInitScript(() => {
        const Original = RTCPeerConnection;
        (window as any).audioTestPeers = [];
        window.RTCPeerConnection = class extends Original {
          constructor(config?: RTCConfiguration) {
            super(config);
            (window as any).audioTestPeers.push(this);
          }
        };
        const NativeSocket = window.WebSocket;
        (window as any).audioTestSockets = [];
        window.WebSocket = class extends NativeSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);
            (window as any).audioTestSockets.push(this);
          }
        };
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => {
        errors.push(error.message);
        console.error('PAGE ERROR', error.message);
      });
      pages.push(page);
      // Reproduce the public gateway failure without touching production users/data.
      await page.route('**/api/v1/rooms/*/messages*', async (route) => {
        const response = await route.fetch({
          url: route.request().url().replace('http://localhost:4200', 'http://localhost:20880'),
        });
        expect(response.status()).toBe(404);
        history404++;
        await route.fulfill({ response });
      });
      await login(page, users[i].email);
      await page.goto(`/salas/${roomId}`);
      console.log('Entrada audio', i + 1, page.url());
    }
    const [sender, receiver] = pages;
    for (const page of pages)
      await expect(page.getByRole('list', { name: 'Participantes de la sala' }).locator('li')).toHaveCount(2);
    await sender.getByLabel('Escribe un mensaje').fill('Chat con historial 404');
    await sender.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
    await expect(receiver.getByText('Chat con historial 404', { exact: true })).toBeVisible();
    await receiver.reload();
    await expect(receiver.getByText('Chat con historial 404', { exact: true })).toBeVisible();
    await sender.getByRole('button', { name: 'Activar micrófono', exact: true }).click();
    const tile = () =>
      receiver.getByRole('list', { name: 'Participantes de la sala' }).locator('li[aria-label^="Audio Uno,"]');
    await expect(tile()).toHaveAttribute('aria-label', /micrófono activado, cámara apagada/);
    await expect.poll(() => audioPackets(receiver), { timeout: 30000 }).toBeGreaterThan(0);
    const enableAudio = receiver.getByRole('button', { name: 'Activar audio', exact: true });
    if (await enableAudio.count()) await enableAudio.first().click();
    await expect
      .poll(() =>
        tile()
          .locator('video')
          .evaluate(
            (video: HTMLVideoElement) =>
              !video.paused && !video.muted && !!(video.srcObject as MediaStream)?.getAudioTracks().length
          )
      )
      .toBe(true);
    await sender.getByRole('button', { name: 'Silenciar micrófono', exact: true }).click();
    await expect(tile()).toHaveAttribute('aria-label', /micrófono apagado/);
    await sender.getByRole('button', { name: 'Activar micrófono', exact: true }).click();
    await expect(tile()).toHaveAttribute('aria-label', /micrófono activado/);
    const oldConnection = await tile().getAttribute('data-connection-id');
    await expect
      .poll(() =>
        sender.evaluate(
          () =>
            (window as any).audioTestSockets.filter((socket: WebSocket) => socket.readyState === WebSocket.OPEN).length
        )
      )
      .toBeGreaterThan(0);
    await sender.evaluate(() => {
      for (const socket of (window as any).audioTestSockets as WebSocket[])
        if (socket.readyState === WebSocket.OPEN) socket.close(1000, 'test reconnect');
    });
    await expect(tile()).not.toHaveAttribute('data-connection-id', oldConnection!);
    await expect(tile()).toHaveAttribute('aria-label', /micrófono activado/);
    await expect.poll(() => audioPackets(receiver), { timeout: 30000 }).toBeGreaterThan(0);
    await sender.getByLabel('Escribe un mensaje').fill('Después de reconectar');
    await sender.getByLabel('Escribe un mensaje').press('Enter');
    await expect(receiver.getByText('Después de reconectar', { exact: true })).toBeVisible();
    expect(history404).toBeGreaterThanOrEqual(3);
    expect(errors).toEqual([]);
    console.log(
      'PASS regresión: REST 404 conserva chat/historial; audio tardío recibido por RTP, icono remoto, mute/unmute y reconexión real de Engine.IO.'
    );
  } catch (error) {
    console.error('REGRESION', String(error));
    for (const page of pages)
      try {
        console.log('PAGINA', page.url(), (await page.locator('body').innerText()).slice(0, 1800));
      } catch {}
    throw error;
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await browser.close();
    if (roomId)
      await fetch(`${api}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${users[0].idToken}` },
      });
  }
});

test('el chat sigue funcionando mediante polling cuando WebSocket no está disponible', async ({ browser }) => {
  const user = await account('Fallback');
  let roomId = '';
  const context = await browser.newContext();
  try {
    await context.addInitScript(() => {
      window.WebSocket = class {
        onerror: ((event: Event) => void) | null = null;
        constructor() {
          setTimeout(() => this.onerror?.(new Event('error')), 0);
        }
        close() {}
      } as any;
    });
    const created = await fetch(`${api}/rooms`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Polling fallback test' }),
    });
    expect(created.status).toBe(201);
    roomId = (await created.json()).id;
    const page = await context.newPage();
    let polling = 0;
    page.on('request', (r) => {
      if (r.url().includes('/socket.io/') && r.url().includes('transport=polling')) polling++;
    });
    await login(page, user.email);
    await page.goto(`/salas/${roomId}`);
    await expect(page.getByRole('list', { name: 'Participantes de la sala' }).locator('li')).toHaveCount(1);
    await page.getByLabel('Escribe un mensaje').fill('Solo polling');
    await page.getByLabel('Escribe un mensaje').press('Enter');
    await expect(page.getByText('Solo polling', { exact: true })).toHaveCount(1);
    expect(polling).toBeGreaterThan(0);
    console.log('PASS regresión: chat autenticado con fallback a polling cuando WebSocket falla.');
  } finally {
    await context.close();
    if (roomId)
      await fetch(`${api}/rooms/${roomId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${user.idToken}` } });
  }
});
