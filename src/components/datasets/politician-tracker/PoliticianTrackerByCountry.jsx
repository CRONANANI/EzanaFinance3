'use client';

/**
 * The politician tracker with a country switch. United States is the
 * STOCK Act trade tracker; Brazil is officeholders' declared assets from the
 * Superior Electoral Court. ?country=br selects Brazil; the US is the default
 * and is omitted from the URL.
 */
import { useCallback, useState } from 'react';
import PoliticianTracker from './PoliticianTracker';
import BrazilTracker from './BrazilTracker';
import Segmented from './Segmented';

const COUNTRIES = [
  { value: 'us', label: 'United States' },
  { value: 'br', label: 'Brazil' },
];

/* Params that belong to one country's view; dropped on a switch. */
const PER_COUNTRY = ['member', 'chamber', 'party', 'sort', 'period', 'q', 'year', 'filing'];

export default function PoliticianTrackerByCountry({ initialCountry = 'us', ...usProps }) {
  const [country, setCountry] = useState(initialCountry === 'br' ? 'br' : 'us');

  const change = useCallback((next) => {
    setCountry(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    for (const k of PER_COUNTRY) url.searchParams.delete(k);
    if (next === 'br') url.searchParams.set('country', 'br');
    else url.searchParams.delete('country');
    window.history.replaceState(window.history.state, '', url);
  }, []);

  const control = (
    <Segmented
      className="ptk-seg-country"
      label="Country"
      value={country}
      options={COUNTRIES}
      onChange={change}
    />
  );

  return country === 'br' ? (
    <BrazilTracker countryControl={control} />
  ) : (
    <PoliticianTracker {...usProps} countryControl={control} />
  );
}
