export type VideoProvider = 'youtube' | 'vimeo' | 'custom';

interface ResolveVideoSourceInput {
  url?: unknown;
  provider?: unknown;
  autoplay?: unknown;
}

export type ResolvedVideoSource =
  | {
      kind: 'empty';
      provider: VideoProvider;
      url: '';
      autoPlay: false;
    }
  | {
      kind: 'embed';
      provider: 'youtube' | 'vimeo';
      url: string;
      embedUrl: string;
      autoPlay: boolean;
    }
  | {
      kind: 'native';
      provider: 'custom';
      url: string;
      autoPlay: boolean;
    };

export function normalizeVideoUrl(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function inferVideoProvider(urlValue: unknown): VideoProvider {
  const url = normalizeVideoUrl(urlValue);
  if (!url) {
    return 'custom';
  }
  if (extractYouTubeId(url)) {
    return 'youtube';
  }
  if (extractVimeoId(url)) {
    return 'vimeo';
  }
  return 'custom';
}

export function resolveVideoProvider(providerValue: unknown, urlValue: unknown): VideoProvider {
  const explicit =
    providerValue === 'youtube' || providerValue === 'vimeo' || providerValue === 'custom'
      ? providerValue
      : null;
  const inferred = inferVideoProvider(urlValue);

  if (explicit === 'youtube' || explicit === 'vimeo') {
    return inferred === explicit || inferred === 'custom' ? explicit : inferred;
  }

  return inferred;
}

export function resolveVideoSource({
  url: urlValue,
  provider: providerValue,
  autoplay,
}: ResolveVideoSourceInput): ResolvedVideoSource {
  const url = normalizeVideoUrl(urlValue);
  const autoPlay = autoplay === true;
  const provider = resolveVideoProvider(providerValue, url);

  if (!url) {
    return {
      kind: 'empty',
      provider,
      url: '',
      autoPlay: false,
    };
  }

  if (provider === 'youtube') {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return {
        kind: 'embed',
        provider,
        url,
        embedUrl: `https://www.youtube.com/embed/${videoId}${autoPlay ? '?autoplay=1&mute=1&playsinline=1&rel=0' : ''}`,
        autoPlay,
      };
    }
  }

  if (provider === 'vimeo') {
    const videoId = extractVimeoId(url);
    if (videoId) {
      return {
        kind: 'embed',
        provider,
        url,
        embedUrl: `https://player.vimeo.com/video/${videoId}${autoPlay ? '?autoplay=1&muted=1' : ''}`,
        autoPlay,
      };
    }
  }

  return {
    kind: 'native',
    provider: 'custom',
    url,
    autoPlay,
  };
}

export function extractYouTubeId(urlValue: unknown) {
  const url = normalizeVideoUrl(urlValue);
  if (!url) {
    return null;
  }

  const matchers = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([\w-]{11})/i,
    /youtube\.com\/embed\/([\w-]{11})/i,
    /youtube\.com\/shorts\/([\w-]{11})/i,
  ];
  for (const matcher of matchers) {
    const match = matcher.exec(url);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function extractVimeoId(urlValue: unknown) {
  const url = normalizeVideoUrl(urlValue);
  if (!url) {
    return null;
  }

  const match = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url);
  return match?.[1] ?? null;
}
