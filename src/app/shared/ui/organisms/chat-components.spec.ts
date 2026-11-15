import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileLimits } from '../../utils/file-validation';
import { ComposerMessage, MessageComposerComponent } from './message-composer/message-composer.component';
import { MessageListComponent, MessageView } from './message-list/message-list.component';

const msg = (id: string, text: string, own = false, minutesAgo = 5): MessageView => ({
  id, authorName: 'Ana', authorInitial: 'A', tone: 'sky', text, attachments: [], own, sentAt: new Date(Date.now() - minutesAgo * 60_000).toISOString()
});

describe('MessageListComponent (accessibility semantics)', () => {
  let fixture: ComponentFixture<MessageListComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageListComponent);
    fixture.componentRef.setInput('messages', [msg('1', 'Hola'), msg('2', 'Qué tal', true)]);
    fixture.detectChanges();
  });

  it('uses a live log region that contains an ordered list (no <ul role=log> with orphan items)', () => {
    const el: HTMLElement = fixture.nativeElement;
    const log = el.querySelector('[role="log"]')!;
    expect(log.tagName).toBe('DIV');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(log.querySelectorAll('ol > li').length).toBe(2);
    expect(el.querySelector('ul[role="log"]')).toBeNull();
    expect(el.querySelector('time')?.getAttribute('datetime')).toBeTruthy();
  });

  it('shows the loading, error and empty states', () => {
    const el: HTMLElement = fixture.nativeElement;
    fixture.componentRef.setInput('state', 'loading');
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    fixture.componentRef.setInput('state', 'error');
    fixture.componentRef.setInput('error', 'Falló');
    fixture.detectChanges();
    expect(el.textContent).toContain('No pudimos cargar los mensajes');
    fixture.componentRef.setInput('state', 'ready');
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();
    expect(el.textContent).toContain('Aún no hay mensajes');
  });

  it('offers older messages only when there are more', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Cargar mensajes anteriores');
    fixture.componentRef.setInput('hasMore', true);
    fixture.detectChanges();
    expect(el.textContent).toContain('Cargar mensajes anteriores');
  });
});

@Component({
  standalone: true,
  imports: [MessageComposerComponent],
  template: `<app-message-composer [limits]="limits" [sending]="sending()" [error]="error()" (send)="sent.push($event)" />`
})
class HostComponent {
  limits: FileLimits = { maxSizeBytes: 1000, maxFiles: 2, allowedExtensions: ['png', 'txt'] };
  sending = signal(false);
  error = signal<string | null>(null);
  sent: ComposerMessage[] = [];
}

describe('MessageComposerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  const pick = (...files: File[]) => {
    const input = el.querySelector<HTMLInputElement>('input[type=file]')!;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const type = (text: string) => {
    const input = el.querySelector<HTMLInputElement>('input[type=text], input:not([type=file])')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('blocks empty messages', () => {
    type('   ');
    submit();
    expect(fixture.componentInstance.sent.length).toBe(0);
  });

  it('previews valid files, rejects invalid ones and lets the user remove or cancel', () => {
    pick(new File(['x'], 'a.txt', { type: 'text/plain' }), new File(['x'], 'virus.exe'));
    expect(el.querySelectorAll('ul[aria-label="Archivos para enviar"] li').length).toBe(1);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('no permitido');
    el.querySelector<HTMLButtonElement>('button[aria-label^="Quitar"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('ul[aria-label="Archivos para enviar"]')).toBeNull();
    pick(new File(['x'], 'b.txt', { type: 'text/plain' }));
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar selección'))!.click();
    fixture.detectChanges();
    expect(el.querySelector('ul[aria-label="Archivos para enviar"]')).toBeNull();
  });

  it('sends only files, only text, or both, and clears the draft only after a successful send', () => {
    pick(new File(['x'], 'a.txt', { type: 'text/plain' }));
    submit();
    expect(fixture.componentInstance.sent[0]).toEqual(jasmine.objectContaining({ text: '' }));
    expect(fixture.componentInstance.sent[0].files.length).toBe(1);
    fixture.componentInstance.sending.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.componentInstance.sending.set(false);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(el.querySelector('ul[aria-label="Archivos para enviar"]')).toBeNull();

    type('Hola');
    submit();
    expect(fixture.componentInstance.sent[1].text).toBe('Hola');

    // con error el borrador se conserva para reintentar
    pick(new File(['x'], 'c.txt', { type: 'text/plain' }));
    submit();
    fixture.componentInstance.sending.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.componentInstance.error.set('Sin conexión');
    fixture.componentInstance.sending.set(false);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(el.querySelector('ul[aria-label="Archivos para enviar"]')).toBeTruthy();
    expect(el.querySelector('p[role="alert"]')?.textContent).toContain('Sin conexión');
  });
});
