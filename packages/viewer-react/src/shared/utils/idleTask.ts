type IdleCallbackHandle = number;

type IdleTaskOptions = {
  timeout?: number;
  fallbackDelayMs?: number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

export function scheduleIdleTask(task: () => void, options: IdleTaskOptions = {}) {
  if (typeof window === 'undefined') {
    task();
    return () => {};
  }

  const { timeout = 800, fallbackDelayMs = 180 } = options;
  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => {
      task();
    }, { timeout });

    return () => {
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(task, fallbackDelayMs);
  return () => {
    window.clearTimeout(handle);
  };
}
