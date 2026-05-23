'use client';

import { PhoneLiveDashboard } from './PhoneLiveDashboard';
import { DesktopLiveMarketAnalysis } from './DesktopLiveMarketAnalysis';

export function HeroDeviceMockups() {
  return (
    <div className="hero-device-stack" aria-label="Ezana platform preview">
      <div className="hero-desktop-frame">
        <div className="hero-desktop-bezel">
          <div className="hero-desktop-bezel-dots">
            <span className="hero-desktop-dot hero-desktop-dot--red" />
            <span className="hero-desktop-dot hero-desktop-dot--yellow" />
            <span className="hero-desktop-dot hero-desktop-dot--green" />
          </div>
        </div>
        <div className="hero-desktop-content">
          <DesktopLiveMarketAnalysis />
        </div>
        <div className="hero-desktop-stand" />
      </div>

      <div className="hero-phone-frame">
        <div className="hero-phone-notch" />
        <div className="hero-phone-content">
          <PhoneLiveDashboard />
        </div>
      </div>
    </div>
  );
}
