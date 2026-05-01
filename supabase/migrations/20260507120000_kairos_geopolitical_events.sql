CREATE TABLE IF NOT EXISTS public.kairos_geopolitical_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  scenario_type TEXT NOT NULL
    CHECK (scenario_type IN ('shipping_disruption', 'opec_cut', 'sanctions', 'conflict', 'climate_event', 'trade_policy', 'other')),
  estimated_probability NUMERIC(5, 4),
  probability_horizon_months INT,
  status TEXT NOT NULL DEFAULT 'monitoring'
    CHECK (status IN ('monitoring', 'developing', 'realized', 'resolved')),
  affected_commodities JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
  source_links JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  realized_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kge_status ON public.kairos_geopolitical_events (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kge_published ON public.kairos_geopolitical_events (is_published, created_at DESC) WHERE is_published = true;

ALTER TABLE public.kairos_geopolitical_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kge readable by authenticated when published" ON public.kairos_geopolitical_events;
CREATE POLICY "kge readable by authenticated when published"
  ON public.kairos_geopolitical_events FOR SELECT TO authenticated
  USING (is_published = true);

CREATE OR REPLACE FUNCTION public.set_kge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'realized'
     AND COALESCE(OLD.status, '') IS DISTINCT FROM 'realized' THEN
    NEW.realized_at = COALESCE(NEW.realized_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kge_updated_at ON public.kairos_geopolitical_events;
CREATE TRIGGER trg_kge_updated_at
  BEFORE UPDATE ON public.kairos_geopolitical_events
  FOR EACH ROW EXECUTE PROCEDURE public.set_kge_updated_at();

-- Seed 8 events (idempotent by title)
INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'Strait of Hormuz blockage',
  'Iran-led closure or major disruption of the Strait of Hormuz shipping corridor. Approximately 20% of global oil supply and 80% of Middle Eastern urea fertilizer exports route through this channel. A blockage of 14+ days would cause acute supply shocks across energy and agriculture inputs.',
  'shipping_disruption', 0.15, 12, 'monitoring',
  '[
    {"symbol":"CL=F","impact_min_pct":18,"impact_max_pct":35,"time_horizon_days":14,"rationale":"Acute crude supply shock"},
    {"symbol":"NG=F","impact_min_pct":8,"impact_max_pct":18,"time_horizon_days":14,"rationale":"LNG redirect logistics"},
    {"symbol":"ZC=F","impact_min_pct":5,"impact_max_pct":15,"time_horizon_days":60,"rationale":"Urea fertilizer shortage → corn input cost rise"},
    {"symbol":"ZW=F","impact_min_pct":4,"impact_max_pct":12,"time_horizon_days":60,"rationale":"Same fertilizer linkage"}
  ]'::jsonb,
  ARRAY['gulf', 'middle-east']::text[],
  '[{"url":"https://www.eia.gov/tools/faqs/faq.php?id=8","label":"EIA: Strait of Hormuz oil flows"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'Strait of Hormuz blockage');

INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'Red Sea Houthi attacks resume',
  'Renewed targeting of commercial vessels in the Red Sea/Bab al-Mandeb strait. Diverts shipping around Cape of Good Hope, adding 10-14 days transit time and ~30% to Asia-Europe freight rates. Affects oil, container goods, and grain shipments.',
  'shipping_disruption', 0.40, 6, 'monitoring',
  '[
    {"symbol":"CL=F","impact_min_pct":3,"impact_max_pct":8,"time_horizon_days":21,"rationale":"Freight cost premium on tanker rates"},
    {"symbol":"ZW=F","impact_min_pct":5,"impact_max_pct":10,"time_horizon_days":45,"rationale":"Grain export logistics impact"}
  ]'::jsonb,
  ARRAY['gulf', 'east-africa']::text[],
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'Red Sea Houthi attacks resume');

INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'OPEC+ production cut extension into Q3',
  'Saudi Arabia + Russia coordinated voluntary production cut of 2M+ barrels/day extended past current expiration. Tight supply with rebounding demand could push WTI sustainably above $90.',
  'opec_cut', 0.55, 6, 'developing',
  '[
    {"symbol":"CL=F","impact_min_pct":8,"impact_max_pct":20,"time_horizon_days":90,"rationale":"Sustained supply restriction"},
    {"symbol":"NG=F","impact_min_pct":3,"impact_max_pct":8,"time_horizon_days":90,"rationale":"Energy substitution effect"}
  ]'::jsonb,
  ARRAY['middle-east', 'gulf']::text[],
  '[{"url":"https://www.opec.org/","label":"OPEC official site"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'OPEC+ production cut extension into Q3');

INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'Russia-Ukraine grain corridor breakdown',
  'Collapse of Black Sea grain shipping agreement or escalation preventing Ukrainian wheat/corn exports. Ukraine accounts for ~10% of global wheat exports and ~13% of corn exports.',
  'conflict', 0.30, 12, 'monitoring',
  '[
    {"symbol":"ZW=F","impact_min_pct":15,"impact_max_pct":35,"time_horizon_days":30,"rationale":"~10% of global wheat supply"},
    {"symbol":"ZC=F","impact_min_pct":8,"impact_max_pct":20,"time_horizon_days":30,"rationale":"~13% of global corn supply"},
    {"symbol":"ZS=F","impact_min_pct":4,"impact_max_pct":10,"time_horizon_days":60,"rationale":"Substitution and cross-elasticity"}
  ]'::jsonb,
  ARRAY['ukraine', 'east-europe']::text[],
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'Russia-Ukraine grain corridor breakdown');

INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'El Niño cocoa drought (West Africa)',
  'El Niño weather pattern persisting through Q1-Q2 brings below-normal rainfall to Ivory Coast and Ghana, the source of 60%+ of global cocoa. Multi-year low yields would push cocoa futures to fresh highs.',
  'climate_event', 0.45, 9, 'developing',
  '[{"symbol":"CC=F","impact_min_pct":20,"impact_max_pct":50,"time_horizon_days":180,"rationale":"60% of global cocoa from affected region"}]'::jsonb,
  ARRAY['west-africa']::text[],
  '[{"url":"https://www.icco.org/","label":"International Cocoa Organization"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'El Niño cocoa drought (West Africa)');

INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'US-China rare earth export restrictions escalate',
  'Expansion of Chinese rare earth and critical mineral export restrictions in retaliation for US tariffs. Affects EV battery supply chain, defense electronics, and semiconductor manufacturing.',
  'trade_policy', 0.35, 12, 'monitoring',
  '[
    {"symbol":"HG=F","impact_min_pct":5,"impact_max_pct":15,"time_horizon_days":90,"rationale":"Substitution effects on industrial metals"},
    {"symbol":"SI=F","impact_min_pct":3,"impact_max_pct":10,"time_horizon_days":120,"rationale":"Solar/electronics demand shift"}
  ]'::jsonb,
  ARRAY['asia', 'us']::text[],
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'US-China rare earth export restrictions escalate');

INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'Major US Gulf hurricane disrupts oil + nat gas',
  'Category 3+ hurricane making landfall along Texas-Louisiana coast during Atlantic season (Jun-Nov). Historical impact: 10-25% of US Gulf oil production and 15% of refining capacity offline for 7-21 days.',
  'climate_event', 0.50, 6, 'monitoring',
  '[
    {"symbol":"CL=F","impact_min_pct":4,"impact_max_pct":10,"time_horizon_days":14,"rationale":"Production disruption"},
    {"symbol":"NG=F","impact_min_pct":8,"impact_max_pct":20,"time_horizon_days":14,"rationale":"Concentrated Gulf nat gas infrastructure"}
  ]'::jsonb,
  ARRAY['gulf']::text[],
  '[{"url":"https://www.nhc.noaa.gov/","label":"NOAA National Hurricane Center"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'Major US Gulf hurricane disrupts oil + nat gas');

INSERT INTO public.kairos_geopolitical_events (title, description, scenario_type, estimated_probability, probability_horizon_months, status, affected_commodities, affected_regions, source_links)
SELECT 'Brazil drought impacts soybean + coffee harvest',
  'La Niña-driven drought conditions in southern Brazil (Mato Grosso, Paraná) during planting season. Brazil accounts for ~37% of global soy exports and ~30% of coffee. A 15% yield reduction would tighten global stocks materially.',
  'climate_event', 0.40, 9, 'developing',
  '[
    {"symbol":"ZS=F","impact_min_pct":10,"impact_max_pct":25,"time_horizon_days":120,"rationale":"~37% of global soybean exports affected"},
    {"symbol":"KC=F","impact_min_pct":15,"impact_max_pct":40,"time_horizon_days":150,"rationale":"~30% of global coffee from Brazil"}
  ]'::jsonb,
  ARRAY['brazil-south']::text[],
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.kairos_geopolitical_events WHERE title = 'Brazil drought impacts soybean + coffee harvest');
