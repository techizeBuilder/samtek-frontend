import { useState, useEffect } from 'react';

// Returns `value` only after it has stopped changing for `delay` ms — so a
// search box can fire one request per pause in typing instead of one per key.
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
