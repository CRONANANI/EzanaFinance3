'use client';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import './kairos-signal.css';

function Card({ icon, title, children, wide }) {
  return (
    <section className={`kairos-card${wide ? ' kairos-card--wide' : ''}`}>
      <div className="kairos-card-header">
        <i className={`bi ${icon}`} aria-hidden />
        {title}
      </div>
      <div className="kairos-card-body">{children}</div>
    </section>
  );
}

export default function KairosSignalPage() {
  return (
    <div className="kairos-page">
      <header className="kairos-hero">
        <div className="kairos-hero-badge">
          <i className="bi bi-activity" aria-hidden />
          Alternative data
        </div>
        <h1>Kairos Signal</h1>
        <p className="kairos-hero-lead">
          Weather and environmental drivers distilled into a structured research framework for commodities and
          macro. Map sensitivity, watch the right regions at the right time, and pair physical signals with market
          context—without mistaking a headline for an edge.
        </p>
      </header>

      <div className="kairos-grid">
        <Card icon="bi-grid-3x3-gap" title="Signal dimensions overview">
          <p>
            <strong>Eight pillars</strong> we monitor to connect conditions on the ground to potential price
            pressure or relief across agriculture, energy, and logistics-linked markets.
          </p>
          <ul className="kairos-list">
            <li>Temperature, GDD, and anomalies vs. historical norms</li>
            <li>Precipitation, drought indices, soil moisture (e.g. PDSI)</li>
            <li>Extreme events: storms, frost, hail, wildfire</li>
            <li>Oceanic patterns: ENSO, sea surface temperatures</li>
            <li>Wind: jet stream, power markets, wildfire spread</li>
            <li>Snowpack, freeze dates, river supply into irrigation</li>
            <li>Solar radiation and cloud cover (yield and solar power)</li>
            <li>Logistics: river levels, ice, storm disruption to ports and pipelines</li>
          </ul>
        </Card>

        <Card icon="bi-thermometer-half" title="Temperature & growing degree days">
          <p>
            <strong>Daily highs and lows</strong> vs. historical averages reveal stress or comfort for crops.
            <strong> Growing Degree Days (GDD)</strong> summarize heat accumulation—critical for development pace.
          </p>
          <p className="kairos-subhead">Why it matters</p>
          <p>
            Corn, wheat, and soybeans are highly temperature-sensitive. Extreme heat can mean crop stress, lower
            yields, and higher prices; mild, cooperative weather can mean surplus and downward pressure.
          </p>
          <div className="kairos-callout">
            Example: a sustained heatwave in the U.S. Midwest during sensitive growth stages can contribute to
            volatility in corn futures.
          </div>
        </Card>

        <Card icon="bi-cloud-rain" title="Precipitation & soil moisture">
          <p>
            Track <strong>rainfall totals</strong>, <strong>drought indices</strong>, and{' '}
            <strong>soil moisture</strong>—often more predictive than rainfall alone for actual plant stress.
          </p>
          <p className="kairos-subhead">Why it matters</p>
          <p>Too little rain → drought and reduced output. Too much → flooding, planting delays, harvest damage.</p>
          <p>
            <strong>Key indicator:</strong> Palmer Drought Severity Index (PDSI) alongside regional soil moisture
            percentiles.
          </p>
        </Card>

        <Card icon="bi-lightning-charge" title="Extreme weather events">
          <p>
            Hurricanes, typhoons, frost, hail, and wildfires can trigger <strong>sudden supply shocks</strong> and
            infrastructure disruption (ports, refineries, pipelines).
          </p>
          <ul className="kairos-list">
            <li>Gulf of Mexico storms → oil &amp; natural gas volatility</li>
            <li>Frost in Brazil → coffee and orange juice spikes</li>
          </ul>
        </Card>

        <Card icon="bi-water" title="Oceanic & climate patterns">
          <p>
            <strong>El Niño / La Niña</strong> and <strong>sea surface temperature</strong> regimes shift rainfall and
            temperature patterns for months.
          </p>
          <p>
            El Niño often means wetter Americas and drier Asia/Australia; La Niña tends to reverse those tendencies—
            driving multi-month commodity trends.
          </p>
        </Card>

        <Card icon="bi-wind" title="Wind patterns">
          <p>
            <strong>Wind speeds</strong> and <strong>jet stream</strong> position affect wind power output, wildfire
            spread, and physical crop damage (e.g. lodging in grains).
          </p>
        </Card>

        <Card icon="bi-snow" title="Snowpack & freeze data">
          <p>
            <strong>Snow depth</strong>, snow-water equivalent, and <strong>freeze dates</strong> feed river levels
            and irrigation supply. Early or late frost can shift planting and harvest risk.
          </p>
        </Card>

        <Card icon="bi-sun" title="Solar radiation & cloud cover">
          <p>
            Sunlight hours and radiation intensity tie directly to photosynthesis and yield—and matter for{' '}
            <strong>solar power</strong> markets as well as agriculture.
          </p>
        </Card>

        <Card icon="bi-ship" title="Weather affecting logistics">
          <p>
            Commodities must move: <strong>low river levels</strong> (e.g. Mississippi bottlenecks),{' '}
            <strong>ice</strong>, and <strong>storm disruption</strong> can tighten physical availability even when
            production is fine.
          </p>
        </Card>

        <Card icon="bi-bar-chart-steps" title="Commodity sensitivity mapping" wide>
          <p>
            Not every market responds equally to the same forecast—target <strong>high beta</strong> to weather
            shocks.
          </p>
          <div className="kairos-two-col">
            <div>
              <p className="kairos-subhead">Most weather-sensitive</p>
              <div className="kairos-pill-row">
                <span className="kairos-pill">Corn, soybeans, wheat</span>
                <span className="kairos-pill">Coffee, sugar</span>
                <span className="kairos-pill">Natural gas</span>
                <span className="kairos-pill">Power markets</span>
              </div>
              <p style={{ marginTop: '0.75rem' }}>
                <strong>Structural read:</strong> agriculture is heavily supply-driven from weather; energy responds
                to both supply shocks and temperature-driven demand.
              </p>
            </div>
            <div>
              <p className="kairos-subhead">Energy-specific lens</p>
              <p>
                Natural gas balances <strong>winter heating</strong> and <strong>summer power (AC)</strong> load.
                Track <strong>HDD</strong> and <strong>CDD</strong> alongside inventories, freight constraints, and
                currency where exports matter (e.g. Brazil real).
              </p>
            </div>
          </div>
        </Card>

        <Card icon="bi-globe-americas" title="Global weather risk zones">
          <p>Focus on <strong>production basins</strong>, not every coordinate on Earth:</p>
          <ul className="kairos-list">
            <li>U.S. Midwest → corn &amp; soybeans</li>
            <li>Brazil → soybeans, coffee</li>
            <li>Russia / Ukraine → wheat</li>
            <li>West Africa → cocoa</li>
            <li>Gulf of Mexico → oil &amp; gas exposure</li>
          </ul>
          <p>
            Tie each region to <strong>planting windows</strong>, <strong>growth stages</strong>, and{' '}
            <strong>harvest periods</strong> so signals land when they can actually move markets.
          </p>
        </Card>

        <Card icon="bi-hourglass-split" title="Critical time windows">
          <p>
            The same weather event can be noise in one month and <strong>market-moving</strong> in another—context is
            lifecycle timing.
          </p>
          <p className="kairos-subhead">Example: corn</p>
          <ul className="kairos-list">
            <li>Planting (Apr–May): too wet → delays</li>
            <li>Pollination (July): heat → yield destruction</li>
            <li>Harvest: rain → quality loss</li>
          </ul>
          <div className="kairos-callout">
            A worsening forecast during pollination often matters more than the same headline two months earlier.
          </div>
        </Card>

        <Card icon="bi-cpu" title="Core signals" wide>
          <div className="kairos-two-col">
            <div>
              <p className="kairos-subhead">A. Weather anomaly</p>
              <p>
                Actual vs. normal: temperature anomaly, rainfall deviation, soil moisture percentile. Example: +5°C
                above normal during pollination flags potential supply stress.
              </p>
              <p className="kairos-subhead">B. Forecast change (often dominant)</p>
              <p>
                Markets react to <strong>delta</strong>: yesterday vs. today, model disagreement (e.g. European vs.
                American runs). A deteriorating forecast frequently matters more than a static bad number.
              </p>
            </div>
            <div>
              <p className="kairos-subhead">C. Yield impact read</p>
              <p>
                Translate weather stress into production risk with heuristics or models—heat in pollination, drought
                thresholds with nonlinear damage. <strong>NDVI</strong> and vegetation health help confirm whether
                crops are actually deteriorating on the ground.
              </p>
              <p className="kairos-subhead">D. Supply shock framing</p>
              <p>
                Connect yield risk to <strong>stocks-to-use</strong>, exports, and expectations. Tight balances react
                harder to the same headline than comfortable inventories.
              </p>
            </div>
          </div>
        </Card>

        <Card icon="bi-people" title="Positioning layer">
          <p>
            Weather is not traded in isolation. Layer in <strong>positioning</strong>, <strong>consensus</strong>,
            and <strong>official reports</strong> (e.g. USDA).
          </p>
          <ul className="kairos-list">
            <li>Are speculators already long or short?</li>
            <li>Is bad weather already priced in?</li>
            <li>Bullish weather + crowded longs can disappoint; bullish weather + complacency can extend a move.</li>
          </ul>
        </Card>

        <Card icon="bi-stopwatch" title="Timing mismatch & edge">
          <p className="kairos-subhead">Three opportunity types</p>
          <ul className="kairos-list">
            <li>
              <strong>Early signal:</strong> stress visible before consensus—largest asymmetry if you are right.
            </li>
            <li>
              <strong>Forecast shift:</strong> sudden model changes create fast windows (hours to days).
            </li>
            <li>
              <strong>Confirmation phase:</strong> NDVI deterioration plus yield reports—slower trend follow-through.
            </li>
          </ul>
        </Card>

        <Card icon="bi-layers" title="Combine with non-weather data">
          <p>
            Refine weather direction with <strong>inventories</strong>, <strong>freight and spreads</strong>,{' '}
            <strong>currency</strong>, and <strong>geopolitics</strong>. Physical stress plus a confirming fundamental
            story is a stronger thesis than sky color alone.
          </p>
        </Card>

        <Card icon="bi-diagram-3" title="Example flow (illustrative)" wide>
          <p className="kairos-subhead">Scenario</p>
          <p>
            Forecast shows a developing drought in Brazil during an early soybean growth stage; rainfall anomalies
            worsen over several days while NDVI softens, yet positioning still looks complacent.
          </p>
          <p className="kairos-subhead">Process</p>
          <ol className="kairos-list">
            <li>Detect anomaly and worsening forecast path—not only the level.</li>
            <li>Confirm vegetation stress where it matters in the calendar.</li>
            <li>Check balances, exports, and positioning for gap vs. narrative.</li>
          </ol>
          <p className="kairos-subhead">Risk management</p>
          <p>
            Stress-test exits: weather improves, the market fully prices yield loss, or crowded positioning flips the
            risk/reward of holding the theme.
          </p>
        </Card>
      </div>
    </div>
  );
}
