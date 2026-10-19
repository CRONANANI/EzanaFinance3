/**
 * Source line and methodology, the target of every "How we calculate this"
 * link on the page.
 */
export function MethodNote() {
  return (
    <section id="pmk-method" className="pmk-method-note" aria-labelledby="pmk-method-title">
      <h2 id="pmk-method-title" className="pmk-method-title">
        How we calculate this
      </h2>
      <div className="pmk-method-cols">
        <div>
          <h3>Prices and volume</h3>
          <p>
            Probabilities are market-implied: the last traded YES price, or the midpoint of the best
            bid and ask when a market has not traded. Polymarket volume is dollars traded; Kalshi
            reports contracts traded, each paying $1 if the market resolves yes. The two are shown
            side by side and never added together.
          </p>
        </div>
        <div>
          <h3>Gaps and confidence</h3>
          <p>
            A gap is the difference between a market-implied probability and a reference, net of
            half the bid-ask spread, the minimum cost of acting on it. High is 4 points or more,
            Medium 2 to 4, Low 1 to 2; gaps under 1 point are not shown. EV% is (reference -
            implied) / (1 - implied). The legislation reference is a structural estimate: the
            historical passage rate for a bill at its current stage.
          </p>
        </div>
        <div>
          <h3>Movers and windows</h3>
          <p>
            Movers rank markets between 3% and 97% with enough recent volume by the size of their
            probability change in the window. Hot marks volume above 3x a market&apos;s own 30-day
            daily average. Longer windows use the price history Ezana records every two hours.
          </p>
        </div>
      </div>
      <p className="pmk-legal">
        Source: Polymarket, Kalshi. Probabilities are market-implied and update every two hours. For
        educational purposes only. Not financial advice.
      </p>
    </section>
  );
}
