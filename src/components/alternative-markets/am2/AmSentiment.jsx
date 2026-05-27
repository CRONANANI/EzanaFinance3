'use client';

export function AmSentiment({ topics = [], onJoin }) {
  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <div className="am2-card-head-titles">
          <h3 className="am2-card-title">Community sentiment</h3>
          <span className="am2-card-subtitle">Top discussions · now</span>
        </div>
      </div>
      <div className="am2-card-body">
        <div className="am2-sentiment">
          {topics.map((t) => {
            const bear = 100 - t.bull;
            return (
              <div key={t.id} className="am2-sentiment-row">
                <div className="am2-sentiment-head">
                  <span className="am2-sentiment-index">{t.id}</span>
                  <div>
                    <div className="am2-sentiment-title">{t.title}</div>
                    <div className="am2-sentiment-summary">
                      {t.posts.toLocaleString()} people discussing
                    </div>
                  </div>
                  <span className="am2-sentiment-posts">{t.posts.toLocaleString()}</span>
                </div>
                <div className="am2-sentiment-bar">
                  <div
                    className="am2-sentiment-bar-bull am2-sentiment-bar-animate"
                    style={{ width: `${t.bull}%` }}
                  />
                  <div className="am2-sentiment-bar-bear" style={{ width: `${bear}%` }} />
                </div>
                <div className="am2-sentiment-foot">
                  <span className="am2-sentiment-foot-bull">BULL · {t.bull}%</span>
                  <span className="am2-sentiment-foot-bear">BEAR · {bear}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="am2-btn am2-btn-secondary"
          style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
          onClick={onJoin}
        >
          Join discussion →
        </button>
      </div>
    </div>
  );
}
