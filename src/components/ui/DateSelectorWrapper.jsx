'use client';

import { DateSelector } from '@/components/ui/DateSelector';
import { useDateRangeSelector } from '@/hooks/useDateRangeSelector';

export function DateSelectorWrapper({
  variant = 'default',
  initialPeriod = '7D',
  onPeriodChange,
  periods = ['1D', '7D', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'],
  size = 'xs',
  inactiveTextColor,
  className,
  style,
}) {
  const { selectedPeriod, handlePeriodChange } = useDateRangeSelector({
    variant,
    initialPeriod,
    onPeriodChange,
    periods,
  });

  return (
    <DateSelector
      ranges={periods}
      value={selectedPeriod}
      onChange={handlePeriodChange}
      variant={variant}
      size={size}
      inactiveTextColor={inactiveTextColor}
      className={className}
      style={style}
    />
  );
}

export default DateSelectorWrapper;
