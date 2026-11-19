import { MediaService } from './media.service';
describe('Media lifecycle', () => {
  it('stops a delayed permission result after the user has left', async () => {
    let resolve!: (stream: MediaStream) => void;
    spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(new Promise((r) => (resolve = r)));
    const stop = jasmine.createSpy('stop');
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const service = new MediaService();
    const request = service.request({ audio: true, video: true });
    service.stop();
    resolve(stream);
    expect(await request).toBeFalse();
    expect(stop).toHaveBeenCalled();
    expect(service.stream()).toBeNull();
    expect(service.permission()).toBe('idle');
  });
  it('replaces a video capture without retaining two cameras', async () => {
    const first = document.createElement('canvas').captureStream();
    const next = document.createElement('canvas').captureStream();
    spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValues(Promise.resolve(first), Promise.resolve(next));
    const service = new MediaService();
    await service.request({ audio: false, video: true });
    await service.request({ audio: false, video: true });
    expect(service.stream()?.getVideoTracks().length).toBe(1);
    expect(first.getVideoTracks()[0].readyState).toBe('ended');
    service.stop();
    expect(next.getVideoTracks()[0].readyState).toBe('ended');
  });
});
