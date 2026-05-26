'use client';

export function SentimentReadout({ isVoted, aggregateSignal, voteCount, userSentiment }) {
  const direction =
    userSentiment === null
      ? null
      : userSentiment >= 60
        ? '↑ Signal'
        : userSentiment >= 40
          ? '— Balanced'
          : '↓ Noise';

  return (
    <div className="echo-footer-readout">
      <div>
        <div className="echo-readout-number-row">
          {isVoted ? (
            <>
              <span className="echo-readout-number">{aggregateSignal}</span>
              <span className="echo-readout-pct">%</span>
            </>
          ) : (
            <span className="echo-readout-number">—</span>
          )}
        </div>
        <div className="echo-readout-meta-1">aggregate signal</div>
        <div className="echo-readout-meta-2">
          {isVoted
            ? `${voteCount} ${voteCount === 1 ? 'vote' : 'votes'} · weighted average`
            : 'No votes yet — yours opens the count'}
        </div>
      </div>

      {direction && (
        <div className="echo-readout-your">
          <div className="echo-readout-your-direction">{direction}</div>
          <div className="echo-readout-your-label">Your read · {userSentiment}%</div>
        </div>
      )}
    </div>
  );
}
