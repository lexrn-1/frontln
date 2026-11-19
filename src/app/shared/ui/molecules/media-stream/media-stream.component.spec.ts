import { TestBed } from '@angular/core/testing';
import { MediaStreamComponent } from './media-stream.component';

describe('Remote stream playback', () => {
  it('retries playback when audio appears later and exposes a user gesture when required', async () => {
    const play = spyOn(HTMLMediaElement.prototype, 'play').and.returnValues(
      Promise.reject(new DOMException('Gesture required', 'NotAllowedError')),
      Promise.resolve()
    );
    spyOn(HTMLMediaElement.prototype, 'pause').and.stub();
    const fixture = TestBed.createComponent(MediaStreamComponent);
    const stream = new MediaStream();
    fixture.componentRef.setInput('stream', stream);
    fixture.detectChanges();
    TestBed.flushEffects();
    await Promise.resolve();
    expect(fixture.componentInstance.blocked()).toBeTrue();
    stream.dispatchEvent(new Event('addtrack'));
    await Promise.resolve();
    expect(play.calls.count()).toBeGreaterThan(1);
    expect(fixture.componentInstance.blocked()).toBeFalse();
    fixture.destroy();
  });
  it('ignores a rejected play promise for a stream that has already been replaced', async () => {
    let reject!: (error: Error) => void;
    spyOn(HTMLMediaElement.prototype, 'play').and.returnValues(new Promise((_r, j) => (reject = j)), Promise.resolve());
    spyOn(HTMLMediaElement.prototype, 'pause').and.stub();
    const fixture = TestBed.createComponent(MediaStreamComponent);
    fixture.componentRef.setInput('stream', new MediaStream());
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.componentRef.setInput('stream', new MediaStream());
    fixture.detectChanges();
    TestBed.flushEffects();
    await Promise.resolve();
    reject(new DOMException('Stale', 'NotAllowedError'));
    await Promise.resolve();
    expect(fixture.componentInstance.blocked()).toBeFalse();
    fixture.destroy();
  });
});
