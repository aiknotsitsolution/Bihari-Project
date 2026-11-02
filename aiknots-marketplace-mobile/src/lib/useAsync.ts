import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Chhota data-fetch hook: loading / refreshing / error handle karta hai. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (mode: "load" | "refresh") => {
    if (mode === "load") setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const result = await fnRef.current();
      if (alive.current) setData(result);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void run("load");
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => run("load"),
    refresh: () => run("refresh"),
  };
}
