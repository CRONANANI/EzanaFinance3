'use client';

export function SentimentHistogram({ distribution, isVoted, userSentiment }) {
  const safeDist =
    distribution && distribution.length === 21 ? distribution : new Array(21).fill(0);
  const maxVotes = Math.max(...safeDist, 1);
  const youBucket =
    isVoted && userSentiment !== null
      ? Math.min(20, Math.max(0, Math.round(userSentiment / 5)))
      : -1;

  const ariaLabel = isVoted
    ? `Sentiment distribution: ${safeDist.reduce((s, v) => s + v, 0)} votes`
    : 'Sentiment distribution: no votes yet';

  return (
    <div className="echo-histogram-wrap" role="img" aria-label={ariaLabel}>
      <div className={`echo-histogram-bars ${isVoted ? 'is-voted' : ''}`}>
        {safeDist.map((count, i) => {
          const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
          const bgPos = isVoted ? `${i * 5}% 0` : '0% 0';
          const isYou = i === youBucket;

          return (
            <div
              key={i}
              className={`echo-histogram-bar ${isYou ? 'is-you' : ''}`}
              style={{
                height: `${Math.max(pct, 3)}%`,
                backgroundPosition: bgPos,
              }}
            >
              {isYou && <div className="echo-histogram-you-label">YOU</div>}
            </div>
          );
        })}
      </div>
      <div className="echo-histogram-axis">
        <span className="echo-histogram-axis-noise">Noise</span>
        <span className="echo-histogram-axis-balanced">Balanced</span>
        <span className="echo-histogram-axis-signal">Signal</span>
      </div>
    </div>
  );
}
