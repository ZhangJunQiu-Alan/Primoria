import { useEffect, useRef, useState } from 'react';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { scheduleIdleTask } from '@/shared/utils/idleTask';
import { publicAssetPath } from '@/shared/utils/publicAsset';

type ViewerWindow = Window & {
  PIXI?: unknown;
  Live2DCubismCore?: unknown;
  __viewerLive2DScriptPromise?: Promise<void>;
};

const CORE_SCRIPT_URL = publicAssetPath('live2d/live2dcubismcore.min.js');
const MODEL_URL = publicAssetPath('live2d-models/hiyori/Hiyori.model3.json');

function loadScriptOnce(src: string) {
  const w = window as ViewerWindow;

  if (w.Live2DCubismCore) {
    return Promise.resolve();
  }

  if (w.__viewerLive2DScriptPromise) {
    return w.__viewerLive2DScriptPromise;
  }

  w.__viewerLive2DScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-viewer-live2d-core="${src}"]`,
    );

    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.viewerLive2dCore = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });

  return w.__viewerLive2DScriptPromise;
}

export function Live2DHeroModel() {
  const language = useProductLanguage();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadModel, setShouldLoadModel] = useState(import.meta.env.MODE === 'test');
  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    import.meta.env.MODE === 'test' ? 'ready' : 'idle',
  );

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      return;
    }

    const host = hostRef.current;
    if (!host) {
      return;
    }

    let disposed = false;
    let observer: IntersectionObserver | undefined;
    let cancelIdleTask: () => void = () => undefined;

    const activateModel = () => {
      if (disposed) {
        return;
      }

      setModelState((current) => (current === 'ready' ? current : 'loading'));
      cancelIdleTask = scheduleIdleTask(
        () => {
          if (!disposed) {
            setShouldLoadModel(true);
          }
        },
        { timeout: 1200, fallbackDelayMs: 140 },
      );
    };

    if (typeof IntersectionObserver === 'undefined') {
      activateModel();
      return () => {
        disposed = true;
        cancelIdleTask();
      };
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer?.disconnect();
        activateModel();
      },
      { rootMargin: '120px 0px' },
    );

    observer.observe(host);

    return () => {
      disposed = true;
      observer?.disconnect();
      cancelIdleTask();
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadModel) {
      return;
    }

    if (import.meta.env.MODE === 'test') {
      setModelState('ready');
      return;
    }

    const host = hostRef.current;
    const canvasHost = canvasRef.current;
    if (!host || !canvasHost) {
      return;
    }
    const hostElement: HTMLDivElement = host;
    const canvasHostElement: HTMLDivElement = canvasHost;

    let disposed = false;
    let app: import('pixi.js-legacy').Application | undefined;
    let model:
      | (import('pixi-live2d-display/cubism4').Live2DModel & {
          anchor: { set: (x: number, y?: number) => void };
        })
      | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let onPointerMove: ((event: PointerEvent) => void) | undefined;
    let onPointerLeave: (() => void) | undefined;

    async function mountModel() {
      await loadScriptOnce(CORE_SCRIPT_URL);

      const PIXI = await import('pixi.js-legacy');
      (window as ViewerWindow).PIXI = PIXI;

      const { Live2DModel } = await import('pixi-live2d-display/cubism4');

      if (disposed || !hostElement.isConnected) {
        return;
      }

      app = new PIXI.Application({
        resizeTo: hostElement,
        autoDensity: true,
        antialias: true,
        backgroundAlpha: 0,
      });

      canvasHostElement.replaceChildren(app.view);

      model = await Live2DModel.from(MODEL_URL, {
        autoInteract: false,
      });

      if (disposed || !app) {
        model.destroy();
        return;
      }

      model.anchor.set(0.5, 1);
      model.interactive = true;
      model.buttonMode = false;
      model.cursor = 'pointer';

      model.on('hit', (hitAreas: string[]) => {
        if (hitAreas.some((area) => area.toLowerCase() === 'body')) {
          void model?.motion('TapBody');
        }
      });

      app.stage.addChild(model);

      const fitModel = () => {
        if (!model) {
          return;
        }

        const width = hostElement.clientWidth;
        const height = hostElement.clientHeight;

        if (!width || !height) {
          return;
        }

        model.scale.set(1);
        const baseWidth = model.width || 1;
        const baseHeight = model.height || 1;
        const scale = Math.min((width * 1.12) / baseWidth, (height * 1.06) / baseHeight);

        model.scale.set(scale);
        model.x = width * 0.4;
        model.y = height * 0.995;
      };

      fitModel();
      void model.motion('Idle');
      setModelState('ready');

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          fitModel();
        });
        resizeObserver.observe(hostElement);
      }

      onPointerMove = (event: PointerEvent) => {
        if (!model) {
          return;
        }

        const rect = hostElement.getBoundingClientRect();
        model.focus(event.clientX - rect.left, event.clientY - rect.top);
      };

      onPointerLeave = () => {
        if (!model) {
          return;
        }

        model.focus(hostElement.clientWidth * 0.5, hostElement.clientHeight * 0.52, true);
      };

      hostElement.addEventListener('pointermove', onPointerMove);
      hostElement.addEventListener('pointerleave', onPointerLeave);
    }

    void mountModel().catch(() => {
      if (!disposed) {
        setModelState('error');
      }
    });

    return () => {
      disposed = true;

      if (onPointerMove) {
        hostElement.removeEventListener('pointermove', onPointerMove);
      }
      if (onPointerLeave) {
        hostElement.removeEventListener('pointerleave', onPointerLeave);
      }

      resizeObserver?.disconnect();
      model?.destroy({ children: true });
      app?.destroy(true, { children: true });
    };
  }, [shouldLoadModel]);

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-visible">
      <div className="pointer-events-none absolute bottom-[6%] left-[10%] h-8 w-[56%] rounded-full bg-[radial-gradient(circle,rgba(114,93,73,0.20),rgba(114,93,73,0)_72%)] blur-xl" />
      <div
        className={[
          'pointer-events-none absolute inset-0 z-0 flex items-end justify-center transition-opacity duration-300',
          modelState === 'ready' ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
        aria-hidden={modelState === 'ready'}
      >
        <div className="viewer-live2d-placeholder-shell">
          <span className="viewer-live2d-placeholder__aura" />
          <span className="viewer-live2d-placeholder__orbit viewer-live2d-placeholder__orbit--outer" />
          <span className="viewer-live2d-placeholder__orbit viewer-live2d-placeholder__orbit--inner" />
          <span className="viewer-live2d-placeholder__core" />
        </div>
      </div>
      <div
        ref={canvasRef}
        className={[
          'absolute inset-0 z-10 transition-opacity duration-300',
          modelState === 'ready' ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      {modelState === 'loading' ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-[#e0d4c1] bg-[rgba(255,252,247,0.82)] px-3 py-1 text-[0.72rem] font-semibold text-[#8a7d71] shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
          {language === 'zh-CN' ? '角色加载中…' : 'Loading companion…'}
        </div>
      ) : null}
      {modelState === 'error' ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-[#e0d4c1] bg-[rgba(255,252,247,0.82)] px-3 py-1 text-[0.72rem] font-semibold text-[#8a7d71] shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
          {language === 'zh-CN' ? '角色暂时不可用' : 'Companion unavailable'}
        </div>
      ) : null}
    </div>
  );
}
