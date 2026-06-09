'use client';

import { useState, useCallback } from 'react';

const DEFAULT_PERIODS = ['1D', '7D', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'];

export function useDateRangeSelector({
  variant = 'default',
  initialPeriod = '7D',
  onPeriodChange,
  periods = DEFAULT_PERIODS,
} = {}) {
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);

  const handlePeriodChange = useCallback(
    (period) => {
      setSelectedPeriod(period);
      onPeriodChange?.(period);
    },
    [onPeriodChange],
  );

  return {
    selectedPeriod,
    handlePeriodChange,
    variant,
    periods,
  };
}
