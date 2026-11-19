import { test, expect, BrowserContext, Page } from '@playwright/test';
const count = Number(process.env['E2E_PARTICIPANTS'] ?? 6);
const API = 'http://localhost:20880/api/v1';
const password = 'BrowserTests123!';
async function seed(index: number) {
  const nonce = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const email = `browser-${nonce}@example.test`;
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  expect(response.status).toBe(200);
  const user = await response.json();
  const complete = await fetch(`${API}/me/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: 'Browser',
      lastName: `User ${index}`,
      username: `b${nonce}`,
      avatar: 'avatar-1',
    }),
  });
  expect(complete.status).toBe(200);
  return { ...user, email };
}
async function instrument(context: BrowserContext) {
  await context.addInitScript(() => {
    const state = window as any;
    state.testPeers = [];
    state.testCaptures = [];
    const Native = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Native {
      constructor(config?: RTCConfiguration) {
        super(config);
        state.testPeers.push(this);
      }
    };
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await capture(constraints);
      state.testCaptures.push(stream);
      return stream;
    };
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;
      let n = 0;
      const timer = setInterval(() => {
        ctx.fillStyle = n++ % 2 ? '#315cfe' : '#e7a16c';
        ctx.fillRect(0, 0, 640, 360);
      }, 100);
      const stream = canvas.captureStream(10);
      state.testScreen = stream;
      stream.getTracks()[0].addEventListener('ended', () => clearInterval(timer));
      return stream;
    };
  });
}
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function grid(page: Page, n: number) {
  await expect(page.getByRole('list', { name: 'Participantes de la sala' }).locator('li')).toHaveCount(n);
}
async function activePeers(page: Page, n: number) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as any).testPeers.filter((p: RTCPeerConnection) => p.connectionState === 'connected').length
        ),
      { timeout: 45000 }
    )
    .toBe(n);
}
test('salas, chat persistente, seis conexiones WebRTC, pantalla, reconexión y salida', async ({ browser }) => {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const errors: string[] = [];
  const users = await Promise.all(Array.from({ length: count }, (_, i) => seed(i)));
  try {
    for (let i = 0; i < count; i++) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        permissions: ['camera', 'microphone', 'clipboard-read', 'clipboard-write'],
      });
      contexts.push(context);
      await instrument(context);
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      pages.push(page);
      await login(page, users[i].email);
      console.log(`Login navegador ${i + 1}/${count}`);
    }
    const owner = pages[0];
    await owner.getByRole('button', { name: 'Crear una sala', exact: true }).first().click();
    await owner
      .getByRole('dialog', { name: 'Crear una nueva sala', exact: true })
      .getByRole('textbox')
      .fill('Sala browser E2E');
    await owner.getByRole('button', { name: 'Crear sala', exact: true }).click();
    await expect(owner).toHaveURL(/salas\/[a-f0-9-]{36}/);
    const id = owner.url().split('/').pop()!;
    console.log('Sala creada');
    await grid(owner, 1);
    console.log('Snapshot recibido');
    await owner
      .getByRole('button', {
        name: /Activar cámara y micrófono|Activar dispositivos|Permitir/,
      })
      .first()
      .click();
    for (let i = 1; i < count; i++) {
      await pages[i].goto(`/salas/${id}`);
      await grid(pages[i], i + 1);
      console.log(`Participante ${i + 1}/${count} en sala`);
      await pages[i]
        .getByRole('button', {
          name: /Activar cámara y micrófono|Activar dispositivos|Permitir/,
        })
        .first()
        .click();
    }
    for (const page of pages) {
      await grid(page, count);
      await activePeers(page, count - 1);
    }
    for (const page of pages) {
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                Array.from(document.querySelectorAll('video')).filter(
                  (v) => !v.muted && v.readyState >= 2 && v.videoWidth > 0
                ).length
            ),
          { timeout: 45000 }
        )
        .toBe(count - 1);
    }
    console.log(
      `PASS navegador: malla de ${count} conexiones, ${count - 1} vídeos remotos por navegador (medios ficticios, misma máquina).`
    );
    const message = `Hola persistente ${Date.now()}`;
    await owner.getByLabel('Escribe un mensaje').fill(message);
    await owner.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
    for (const page of pages) await expect(page.getByText(message, { exact: true })).toHaveCount(1);
    await owner.getByRole('button', { name: /Compartir pantalla/ }).click();
    await expect
      .poll(() =>
        owner.evaluate(() =>
          (window as any).testPeers
            .filter((p: RTCPeerConnection) => p.connectionState === 'connected')
            .every((p: RTCPeerConnection) =>
              p.getSenders().some((s) => s.track?.id === (window as any).testScreen.getVideoTracks()[0].id)
            )
        )
      )
      .toBe(true);
    await owner
      .getByRole('button', { name: /Dejar de compartir|Detener pantalla/ })
      .first()
      .click();
    await expect
      .poll(() =>
        owner.evaluate(() =>
          (window as any).testPeers
            .filter((p: RTCPeerConnection) => p.connectionState === 'connected')
            .every((p: RTCPeerConnection) =>
              p
                .getSenders()
                .some(
                  (s) =>
                    s.track?.kind === 'video' && s.track.id === (window as any).testCaptures[0].getVideoTracks()[0].id
                )
            )
        )
      )
      .toBe(true);
    console.log('PASS navegador: pantalla sustituye la pista y al detenerla restaura la cámara.');
    await owner.getByRole('button', { name: 'Compartir pantalla', exact: true }).click();
    await owner.evaluate(() => {
      const track = (window as any).testScreen.getVideoTracks()[0];
      track.stop();
      track.dispatchEvent(new Event('ended'));
    });
    await expect(owner.getByRole('button', { name: 'Compartir pantalla', exact: true })).toBeVisible();
    for (const page of pages) await activePeers(page, count - 1);
    // Simular desconexión y un mensaje perdido: HTTP recupera el hueco tras reconectar.
    await contexts[1].setOffline(true);
    const missed = `Durante desconexión ${Date.now()}`;
    await owner.getByLabel('Escribe un mensaje').fill(missed);
    await owner.getByLabel('Escribe un mensaje').press('Enter');
    await contexts[1].setOffline(false);
    await expect(pages[1].getByText(missed, { exact: true })).toHaveCount(1);
    await grid(pages[1], count);
    await pages[1].reload();
    await expect(pages[1].getByText(message, { exact: true })).toHaveCount(1);
    await expect(pages[1].getByText(missed, { exact: true })).toHaveCount(1);
    // Denegar captura después de volver a entrar: el chat sigue funcionando.
    await pages[1].evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Denied', 'NotAllowedError');
      };
    });
    await pages[1]
      .getByRole('button', {
        name: /Activar cámara y micrófono|Activar dispositivos|Permitir/,
      })
      .first()
      .click();
    await expect(pages[1].getByText(/Bloqueaste el acceso/)).toBeVisible();
    await pages[1].getByLabel('Escribe un mensaje').fill('Chat sin permisos');
    await pages[1].getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
    await expect(owner.getByText('Chat sin permisos', { exact: true })).toBeVisible();
    await pages[2]
      .getByRole('button', { name: /Salir de la sala/ })
      .first()
      .click();
    await expect(pages[2]).toHaveURL(/dashboard/);
    await grid(owner, count - 1);
    expect(
      await pages[2].evaluate(() =>
        (window as any).testCaptures.every((s: MediaStream) => s.getTracks().every((t) => t.readyState === 'ended'))
      )
    ).toBe(true);
    expect(
      await pages[2].evaluate(() =>
        (window as any).testPeers.every((p: RTCPeerConnection) => p.connectionState === 'closed')
      )
    ).toBe(true);
    console.log(
      'PASS navegador: persistencia, reconexión sin duplicados, permisos denegados conservan chat y salir cierra pistas/pares.'
    );
    // Eliminar desde el dashboard del propietario expulsa a quienes siguen conectados.
    await owner
      .getByRole('button', { name: /Salir de la sala/ })
      .first()
      .click();
    await expect(owner).toHaveURL(/dashboard/);
    await owner
      .getByRole('button', {
        name: 'Eliminar la sala Sala browser E2E',
        exact: true,
      })
      .click();
    await owner.getByRole('button', { name: 'Eliminar sala', exact: true }).click();
    for (const page of pages.filter((_, i) => i !== 0 && i !== 2)) await expect(page).toHaveURL(/dashboard/);
    expect(errors).toEqual([]);
    console.log('PASS navegador: eliminación redirige participantes y no hay errores JS.');
  } catch (error) {
    console.error('E2E fallo:', String(error));
    for (const page of pages) {
      try {
        console.log(
          'Estado RTC',
          await page.evaluate(() =>
            (window as any).testPeers.map((p: RTCPeerConnection) => ({
              state: p.connectionState,
              ice: p.iceConnectionState,
              signaling: p.signalingState,
              send: p.getSenders().map((s) => s.track?.kind),
            }))
          )
        );
      } catch {}
    }
    console.log('Errores JS:', errors);
    throw error;
  } finally {
    await Promise.race([
      Promise.all(contexts.map((context) => context.close())),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  }
});

test('enlace protegido, copia accesible y edición del propietario', async ({ browser }) => {
  const ownerUser = await seed(10),
    guestUser = await seed(11);
  const created = await fetch(`${API}/rooms`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerUser.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sala enlace directo' }),
  });
  expect(created.status).toBe(201);
  const room = await created.json();
  const ownerContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] }),
    guestContext = await browser.newContext();
  try {
    const guest = await guestContext.newPage();
    await guest.goto(`/salas/${room.id}`);
    await expect(guest).toHaveURL(/login.*returnUrl/);
    await guest.getByLabel('Correo', { exact: true }).fill(guestUser.email);
    await guest.getByLabel('Contraseña', { exact: true }).fill(password);
    await guest.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(guest).toHaveURL(new RegExp(`/salas/${room.id}$`));
    await grid(guest, 1);
    const owner = await ownerContext.newPage();
    await login(owner, ownerUser.email);
    await owner.getByRole('button', { name: 'Copiar ID de Sala enlace directo', exact: true }).click();
    expect(await owner.evaluate(() => navigator.clipboard.readText())).toBe(room.id);
    await expect(owner.getByText(/copiado/i).first()).toBeVisible();
    await owner.getByRole('button', { name: 'Más opciones de Sala enlace directo', exact: true }).click();
    await owner.getByRole('menuitem', { name: 'Editar nombre' }).click();
    const dialog = owner.getByRole('dialog', { name: 'Editar nombre de la sala', exact: true });
    await dialog.getByRole('textbox').fill('Nombre actualizado');
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(owner.getByRole('heading', { name: 'Nombre actualizado', exact: true })).toBeVisible();
    await expect(guest.getByRole('heading', { name: 'Nombre actualizado', exact: true })).toBeVisible();
    await guest.getByRole('button', { name: 'Salir de la sala', exact: true }).first().click();
    await expect(guest).toHaveURL(/dashboard/);
    await expect(guest.getByRole('button', { name: /Eliminar la sala|Más opciones de Nombre/ })).toHaveCount(0);
    const removed = await fetch(`${API}/rooms/${room.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerUser.idToken}` },
    });
    expect(removed.status).toBe(202);
    console.log(
      'PASS navegador: vuelta al enlace tras login, copia anunciada y edición OWNER reflejada en participante.'
    );
  } finally {
    await Promise.race([
      Promise.all([ownerContext.close(), guestContext.close()]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  }
});
