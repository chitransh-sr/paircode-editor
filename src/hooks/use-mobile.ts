import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Initialize with initialValue so the first client render matches SSR HTML.
  // The stored value is synced in an effect after mount (no hydration mismatch).
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return;
      try {
        setStoredValue(JSON.parse(item) as T);
      } catch {
        // Tolerate plain strings stored without JSON encoding
        setStoredValue(item as T);
      }
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        if (typeof window !== "undefined") {
          try {
            // Store raw strings as-is so direct localStorage readers
            // (and other tabs) see the plain value, not quoted JSON.
            window.localStorage.setItem(
              key,
              typeof newValue === "string" ? newValue : JSON.stringify(newValue)
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};
