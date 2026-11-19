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

describe('Microphone source state', () => {
  it('tracks enabled/live state and reacquires an ended audio track', async () => {
    const context = new AudioContext();
    const stream = context.createMediaStreamDestination().stream;
    const next = stream.clone();
    spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValues(Promise.resolve(stream), Promise.resolve(next));
    const service = new MediaService();
    try {
      await service.request({ audio: true, video: false });
      expect(service.audioEnabled()).toBeTrue();
      service.setEnabled('audio', false);
      expect(service.audioEnabled()).toBeFalse();
      service.setEnabled('audio', true);
      expect(service.audioEnabled()).toBeTrue();
      const track = stream.getAudioTracks()[0];
      track.stop();
      track.dispatchEvent(new Event('ended'));
      expect(service.hasTrack('audio')).toBeFalse();
      expect(service.audioEnabled()).toBeFalse();
      await service.request({ audio: true, video: false });
      expect(service.hasTrack('audio')).toBeTrue();
      expect(service.audioEnabled()).toBeTrue();
    } finally {
      service.stop();
      await context.close();
    }
  });
});
