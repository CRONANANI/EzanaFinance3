'use client';

/**
 * Every dimension except the selected one, as compact cards in taxonomy
 * order. A card selects its dimension on the sonar (same as its blip); it does
 * not navigate. The hub link lives in the detail panel.
 */
import { useSonarSelection } from './SonarSelection';

export default function OtherSix({ dims }) {
  const { selected, select } = useSonarSelection();
  const others = dims.filter((d) => d.id !== selected);
  return (
    <section className="dso-others" aria-labelledby="dso-others-h">
      <h2 className="dso-eyebrow-sm" id="dso-others-h">
        The other {others.length === 6 ? 'six' : others.length}
      </h2>
      <div className="dso-others-grid">
        {others.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`dso-dimcard${d.isLive ? '' : ' is-road'}`}
            style={{ '--dso-c': d.color }}
            onClick={() => select(d.id, 'card')}
            aria-label={`${d.label}, ${d.isLive ? `${d.liveCount} live datasets` : 'on the roadmap'}. Show on the sonar.`}
          >
            <span className="dso-dimcard-head">
              <i className={`bi ${d.icon} dso-dimcard-ic`} aria-hidden="true" />
              <span className="dso-dimcard-name">{d.label}</span>
              {d.isLive ? (
                <span className="dso-dimcard-live dso-mono">{d.liveCount} LIVE</span>
              ) : (
                <span className="dso-soon">Soon</span>
              )}
            </span>
            <span className="dso-dimcard-blurb">{d.blurb}</span>
            <span className="dso-dimcard-list dso-mono">
              {(d.isLive ? d.live : d.road)
                .slice(0, 3)
                .map((x) => x.label)
                .join(' · ')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
