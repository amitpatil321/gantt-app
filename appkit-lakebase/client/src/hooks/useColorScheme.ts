import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-color-scheme: dark)';

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

/** Returns 'dark' or 'light' following the OS preference (matches index.css). */
export function useColorScheme(): 'dark' | 'light' {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(QUERY).matches ? 'dark' : 'light'),
    () => 'light',
  );
}
