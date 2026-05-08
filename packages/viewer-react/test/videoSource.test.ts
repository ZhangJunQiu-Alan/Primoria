import { describe, expect, it } from 'vitest';
import {
  extractVimeoId,
  extractYouTubeId,
  inferVideoProvider,
  resolveVideoSource,
} from '@/shared/media/videoSource';

describe('videoSource helpers', () => {
  it('detects YouTube links across common URL shapes', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(inferVideoProvider('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('detects Vimeo links', () => {
    expect(extractVimeoId('https://vimeo.com/148751763')).toBe('148751763');
    expect(inferVideoProvider('https://player.vimeo.com/video/148751763')).toBe('vimeo');
  });

  it('treats uploaded or direct file URLs as native video sources', () => {
    expect(
      resolveVideoSource({
        url: 'https://cdn.example.com/course/lesson/video.mov',
      }),
    ).toMatchObject({
      kind: 'native',
      provider: 'custom',
      url: 'https://cdn.example.com/course/lesson/video.mov',
    });
  });

  it('builds embed URLs for supported providers', () => {
    expect(
      resolveVideoSource({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        autoplay: true,
      }),
    ).toMatchObject({
      kind: 'embed',
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1&rel=0',
    });

    expect(
      resolveVideoSource({
        url: 'https://vimeo.com/148751763',
      }),
    ).toMatchObject({
      kind: 'embed',
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/148751763',
    });
  });
});
