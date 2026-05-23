'use client';

import { useCallback, useState, useEffect } from 'react';
import { GlobeWithNotificationCards } from './GlobeWithNotificationCards';
import HeroLightning from '@/components/ui/HeroLightning';
import { useLightning } from '@/components/ui/LightningContext';

export function GlobeSection() {
  const [globeSize, setGlobeSize] = useState(420);
  const [cardTrigger, setCardTrigger] = useState({ side: null, nonce: 0 });
  const { strike } = useLightning();

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 480) setGlobeSize(220);
      else if (w < 768) setGlobeSize(320);
      else if (w < 1024) setGlobeSize(380);
      else setGlobeSize(Math.min(460, w - 96));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const onLightningStrike = useCallback(
    (side) => {
      setCardTrigger((prev) => ({ side, nonce: prev.nonce + 1 }));
      strike();
    },
    [strike],
  );

  return (
    <section className="globe-section" aria-label="Live market intelligence">
      <div className="globe-section-inner">
        <GlobeWithNotificationCards
          size={globeSize}
          onGlobeReady={() => {}}
          triggerSide={cardTrigger.side}
          triggerNonce={cardTrigger.nonce}
        />
        <HeroLightning intervalMs={3300} onStrike={onLightningStrike} />
      </div>
    </section>
  );
}
