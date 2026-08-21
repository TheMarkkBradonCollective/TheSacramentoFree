import NewspaperPageTurnLayer from './NewspaperPageTurnLayer';
import NewspaperTypewriterLayer from './NewspaperTypewriterLayer';

/** Mounts the decorative newspaper layers once, above the whole application. */
export default function NewspaperExperienceLayer() {
  return (
    <>
      <NewspaperPageTurnLayer />
      <NewspaperTypewriterLayer />
    </>
  );
}
