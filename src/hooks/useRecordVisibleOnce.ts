import { useEffect, useRef } from 'react';

/**
 * Record once per id when the matching element stays in view.
 * Used for Updates / News seen-by counts when there is no “full story” to expand.
 */
export function useRecordVisibleOnce<T extends { id: string }>(
  items: T[],
  record: (item: T) => void,
  enabled: boolean,
  selector: string,
  datasetKey: string,
): void {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const recordRef = useRef(record);
  recordRef.current = record;

  const itemKey = items.map((row) => row.id).join('|');

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset[datasetKey];
          if (!id) continue;
          const item = itemsRef.current.find((row) => row.id === id);
          if (item) recordRef.current(item);
        }
      },
      { threshold: 0.45 },
    );

    const nodes = document.querySelectorAll(selector);
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [datasetKey, enabled, itemKey, selector]);
}
