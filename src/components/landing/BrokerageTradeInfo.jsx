'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

/**
 * The small ⓘ affordance after the "trusted data partners" line.
 *
 * Uses a Popover (not a Tooltip) on purpose: the popup carries a real
 * help-center LINK the user must be able to click, and a hover-only Radix
 * tooltip dismisses as you move toward the link. This opens on hover, click,
 * and keyboard focus, then stays put until an outside-click or Esc — so the
 * link is always reachable, and it's tappable on touch.
 *
 * Client component so the rest of BrokerageLogos can stay static.
 */
export function BrokerageTradeInfo() {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="bl-info-btn"
          aria-label="Which brokerages allow trading from Ezana?"
          onMouseEnter={() => setOpen(true)}
        >
          <Info size={14} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="bl-info-pop" side="top" align="center" sideOffset={8}>
          <span>Only select brokerages allow users to place trades from Ezana.</span>{' '}
          <a href="/help-center/user/article/supported-brokerages" className="bl-info-link">
            See which ones →
          </a>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
