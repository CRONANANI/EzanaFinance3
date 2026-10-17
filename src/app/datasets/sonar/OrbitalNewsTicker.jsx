'use client';

/**
 * The overview's news, handed to the top bar (Oct 16).
 *
 * The notification cards used to be born at the orbital map's hub and fly out
 * to rails either side of it. They now run as a conveyor belt inside the top
 * bar, beside the Ezana logo (NewsBelt, drawn by DatasetChrome), so this
 * component only publishes the rows through the layout's ticker slot and
 * renders the map on its own. Every row is real (news-feed.js maps the
 * Politician Tracker and Government Contracts feeds); with none, the belt is
 * simply absent.
 */
import { usePublishTicker } from '@/components/datasets/ticker-slot';

export default function OrbitalNewsTicker({ items, children }) {
  usePublishTicker({ items, ariaLabel: 'Latest from Ezana datasets' });
  return (
    <div className="dso-news dso-news--solo">
      <div className="dso-news-center">{children}</div>
    </div>
  );
}
