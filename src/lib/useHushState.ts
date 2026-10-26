import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDemoState,
  createEmptyState,
  isExtensionEnvironment,
  loadState,
  saveState,
  subscribeToState,
  type HushState,
} from './storage';

export function useHushState() {
  const [state, setState] = useState<HushState>(() => isExtensionEnvironment() ? createEmptyState() : createDemoState());
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void loadState(true).then((stored) => {
      if (!mounted.current) return;
      setState(stored);
      setLoaded(true);
      if (!isExtensionEnvironment()) void saveState(stored).catch(() => undefined);
    });
    const unsubscribe = subscribeToState((stored) => {
      if (mounted.current) setState(stored);
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, []);

  const updateState = useCallback((updater: (current: HushState) => HushState) => {
    setState((current) => {
      const next = updater(current);
      void saveState(next).catch(() => undefined);
      return next;
    });
  }, []);

  return { state, updateState, loaded };
}
