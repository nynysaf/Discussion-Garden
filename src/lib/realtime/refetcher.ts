/**
 * Re-reads data after a change or reconnect. Bursts of triggers collapse
 * into one fetch, and a slow older fetch can never overwrite a newer one.
 */
export function createRefetcher<T>(options: {
  fetch: () => Promise<T>;
  onData: (data: T) => void;
  onError?: (error: unknown) => void;
  debounceMs?: number;
}): { trigger: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest = 0;
  let cancelled = false;

  const run = async () => {
    const id = ++latest;
    try {
      const data = await options.fetch();
      if (!cancelled && id === latest) options.onData(data);
    } catch (error) {
      if (!cancelled && id === latest) options.onError?.(error);
    }
  };

  return {
    trigger() {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, options.debounceMs ?? 50);
    },
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
    },
  };
}
