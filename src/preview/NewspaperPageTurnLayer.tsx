import { useEffect, useRef, useState } from 'react';
import { useNewspaperExperience } from './NewspaperExperienceContext';
import { useNewspaperSkin } from './NewspaperSkinContext';
import { onNewspaperPageTurn, type PageTurnDirection } from './pageTurn';

const DESKTOP_MS = 620;
const COMPACT_MS = 240;

/**
 * The sheet that turns when you move between sections.
 *
 * Desktop gets a full broadsheet leaf rotating over the page; phones get a
 * short paper slide instead. Purely decorative — it never takes pointer events
 * and it is skipped entirely under reduced motion.
 */
export default function NewspaperPageTurnLayer() {
  const { enabled } = useNewspaperSkin();
  const { prefs, motionReduced, compact, play } = useNewspaperExperience();
  const [turn, setTurn] = useState<{ id: number; direction: PageTurnDirection } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    return onNewspaperPageTurn((direction) => {
      if (prefs.pageSounds) play('pageTurn', 'page');
      if (motionReduced || !prefs.immersiveMode) return;

      counter.current += 1;
      setTurn({ id: counter.current, direction });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setTurn(null), compact ? COMPACT_MS : DESKTOP_MS);
    });
  }, [enabled, prefs.pageSounds, prefs.immersiveMode, motionReduced, compact, play]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!enabled || !turn) return null;

  return (
    <div
      key={turn.id}
      className={`tsf-page-turn tsf-page-turn--${compact ? 'compact' : 'sheet'} tsf-page-turn--${turn.direction}`}
      aria-hidden="true"
    >
      <div className="tsf-page-turn__leaf">
        <div className="tsf-page-turn__face tsf-page-turn__face--front" />
        <div className="tsf-page-turn__face tsf-page-turn__face--back" />
      </div>
      <div className="tsf-page-turn__shadow" />
    </div>
  );
}
