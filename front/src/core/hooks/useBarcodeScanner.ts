import { useEffect, useRef } from 'react';

interface UseBarcodeOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxDelay?: number;
}

/**
 * Detects USB barcode scanner input by monitoring rapid key sequences
 * ending with Enter. Works globally regardless of which element has focus.
 *
 * USB scanners type characters in rapid succession (< 50ms between chars)
 * then send Enter. This is distinguishable from human typing.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 3,
  maxDelay = 50,
}: UseBarcodeOptions) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement;

      // If typing in a focused text/number input, let normal flow handle it
      if (
        target instanceof HTMLInputElement &&
        (target.type === 'text' || target.type === 'search' || target.type === 'number') &&
        target.classList.contains('search-field')
      ) {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScan(buffer.current);
        }
        buffer.current = '';
        lastKeyTime.current = 0;
        return;
      }

      // Only accept printable single characters
      if (e.key.length !== 1) {
        return;
      }

      // If too much time has passed since last key, reset buffer
      if (now - lastKeyTime.current > maxDelay && buffer.current.length > 0) {
        buffer.current = '';
      }

      buffer.current += e.key;
      lastKeyTime.current = now;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onScan, minLength, maxDelay]);
}
