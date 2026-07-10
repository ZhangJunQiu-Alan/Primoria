const scriptPromises = new Map<string, Promise<unknown>>();

export function loadBrowserScript<T>(url: string, globalName: string): Promise<T> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error(`Browser script ${globalName} can only load in the browser.`));
  }

  const globals = window as unknown as Record<string, unknown>;
  const loaded = globals[globalName];
  if (loaded) return Promise.resolve(loaded as T);

  const pending = scriptPromises.get(url);
  if (pending) return pending as Promise<T>;

  const promise = new Promise<T>((resolve, reject) => {
    const finish = () => {
      const value = globals[globalName];
      if (value) resolve(value as T);
      else reject(new Error(`${globalName} loaded without exposing its browser global.`));
    };
    const fail = (script: HTMLScriptElement) => {
      script.remove();
      reject(new Error(`Failed to load ${globalName} from ${url}.`));
    };
    const absoluteUrl = new URL(url, window.location.href).href;
    const existing = Array.from(document.scripts).find((script) => script.src === absoluteUrl);

    if (existing) {
      if (existing.dataset.primoriaLoaded === "true") {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => fail(existing), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => {
      script.dataset.primoriaLoaded = "true";
      finish();
    }, { once: true });
    script.addEventListener("error", () => fail(script), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromises.delete(url);
    throw error;
  });

  scriptPromises.set(url, promise);
  return promise;
}
