'use client';

/**
 * The overview's signals, handed to the top bar (Oct 16; live pulse Oct 21).
 *
 * The belt itself is drawn by the layout chrome (NewsBelt via DatasetChrome),
 * beside the Ezana logo. This component publishes the pulse items through the
 * layout's ticker slot, with the handler that opens a signal's brief on this
 * page and the key of the one open now. Every row is real (the pulse adapters
 * map the live datasets' own readers); with none, the belt is simply absent.
 *
 * Nov 26 2026: `publish={false}` (the in-app Sonar home) keeps the top bar
 * clear: nothing is handed to the slot, so no belt is drawn there.
 */
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { usePulse } from './PulseProvider';

const NO_ITEMS = [];

export default function OrbitalNewsTicker({ children, publish = true }) {
  const { items, open, openKey } = usePulse();
  usePublishTicker({
    items: publish ? items : NO_ITEMS,
    onSelect: open,
    ariaLabel: 'Latest signals from Ezana datasets',
    activeKey: openKey,
  });
  return (
    <div className="dso-news dso-news--solo">
      <div className="dso-news-center">{children}</div>
    </div>
  );
}
