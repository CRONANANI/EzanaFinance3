-- =============================================================================
-- Empire Rankings data backbone — seed data
-- -----------------------------------------------------------------------------
-- Populates:
--   • empire_countries   — top-60 by economic weight (upserts the existing
--                          11 rows and adds 49 more).
--   • empire_dimensions  — the 18 Dalio-style dimensions shown on the UI.
--   • dimension_metric_map — the first batch of World-Bank metric mappings
--                          plus placeholder rows for the 7 dimensions that
--                          still need source wiring (IMF/SIPRI/WIPO/...).
-- =============================================================================

-- ─── 1. Countries (top 60 by 2024 GDP, ISO-3 codes) ──────────────────────────
insert into public.empire_countries (code, name, flag, region, iso2, economic_rank, included) values
  ('USA','United States','🇺🇸','Americas','US',1,true),
  ('CHN','China','🇨🇳','Asia-Pacific','CN',2,true),
  ('DEU','Germany','🇩🇪','Europe','DE',3,true),
  ('JPN','Japan','🇯🇵','Asia-Pacific','JP',4,true),
  ('IND','India','🇮🇳','Asia-Pacific','IN',5,true),
  ('GBR','United Kingdom','🇬🇧','Europe','GB',6,true),
  ('FRA','France','🇫🇷','Europe','FR',7,true),
  ('ITA','Italy','🇮🇹','Europe','IT',8,true),
  ('BRA','Brazil','🇧🇷','Americas','BR',9,true),
  ('CAN','Canada','🇨🇦','Americas','CA',10,true),
  ('RUS','Russia','🇷🇺','Europe','RU',11,true),
  ('KOR','South Korea','🇰🇷','Asia-Pacific','KR',12,true),
  ('AUS','Australia','🇦🇺','Asia-Pacific','AU',13,true),
  ('MEX','Mexico','🇲🇽','Americas','MX',14,true),
  ('ESP','Spain','🇪🇸','Europe','ES',15,true),
  ('IDN','Indonesia','🇮🇩','Asia-Pacific','ID',16,true),
  ('TUR','Turkey','🇹🇷','Europe','TR',17,true),
  ('NLD','Netherlands','🇳🇱','Europe','NL',18,true),
  ('SAU','Saudi Arabia','🇸🇦','MENA','SA',19,true),
  ('CHE','Switzerland','🇨🇭','Europe','CH',20,true),
  ('POL','Poland','🇵🇱','Europe','PL',21,true),
  ('ARG','Argentina','🇦🇷','Americas','AR',22,true),
  ('BEL','Belgium','🇧🇪','Europe','BE',23,true),
  ('SWE','Sweden','🇸🇪','Europe','SE',24,true),
  ('IRL','Ireland','🇮🇪','Europe','IE',25,true),
  ('ISR','Israel','🇮🇱','MENA','IL',26,true),
  ('ARE','UAE','🇦🇪','MENA','AE',27,true),
  ('SGP','Singapore','🇸🇬','Asia-Pacific','SG',28,true),
  ('MYS','Malaysia','🇲🇾','Asia-Pacific','MY',29,true),
  ('ZAF','South Africa','🇿🇦','Africa','ZA',30,true),
  ('PHL','Philippines','🇵🇭','Asia-Pacific','PH',31,true),
  ('THA','Thailand','🇹🇭','Asia-Pacific','TH',32,true),
  ('EGY','Egypt','🇪🇬','MENA','EG',33,true),
  ('NGA','Nigeria','🇳🇬','Africa','NG',34,true),
  ('BGD','Bangladesh','🇧🇩','Asia-Pacific','BD',35,true),
  ('VNM','Vietnam','🇻🇳','Asia-Pacific','VN',36,true),
  ('IRN','Iran','🇮🇷','MENA','IR',37,true),
  ('PAK','Pakistan','🇵🇰','Asia-Pacific','PK',38,true),
  ('AUT','Austria','🇦🇹','Europe','AT',39,true),
  ('COL','Colombia','🇨🇴','Americas','CO',40,true),
  ('CHL','Chile','🇨🇱','Americas','CL',41,true),
  ('ROU','Romania','🇷🇴','Europe','RO',42,true),
  ('NOR','Norway','🇳🇴','Europe','NO',43,true),
  ('DNK','Denmark','🇩🇰','Europe','DK',44,true),
  ('CZE','Czechia','🇨🇿','Europe','CZ',45,true),
  ('FIN','Finland','🇫🇮','Europe','FI',46,true),
  ('PRT','Portugal','🇵🇹','Europe','PT',47,true),
  ('NZL','New Zealand','🇳🇿','Asia-Pacific','NZ',48,true),
  ('PER','Peru','🇵🇪','Americas','PE',49,true),
  ('GRC','Greece','🇬🇷','Europe','GR',50,true),
  ('QAT','Qatar','🇶🇦','MENA','QA',51,true),
  ('KAZ','Kazakhstan','🇰🇿','Asia-Pacific','KZ',52,true),
  ('HUN','Hungary','🇭🇺','Europe','HU',53,true),
  ('UKR','Ukraine','🇺🇦','Europe','UA',54,true),
  ('MAR','Morocco','🇲🇦','Africa','MA',55,true),
  ('KWT','Kuwait','🇰🇼','MENA','KW',56,true),
  ('ECU','Ecuador','🇪🇨','Americas','EC',57,true),
  ('KEN','Kenya','🇰🇪','Africa','KE',58,true),
  ('DZA','Algeria','🇩🇿','Africa','DZ',59,true),
  ('ETH','Ethiopia','🇪🇹','Africa','ET',60,true)
on conflict (code) do update set
  name = excluded.name,
  flag = excluded.flag,
  region = excluded.region,
  iso2 = excluded.iso2,
  economic_rank = excluded.economic_rank,
  included = excluded.included;

-- EUR is a bloc, not an ISO-3 country — World Bank has no data for it.
-- Leave the row intact for legacy display code but exclude it from scoring.
update public.empire_countries
   set included = false
 where code = 'EUR';

-- ─── 2. The 18 dimensions (labels match the UI card exactly) ─────────────────
insert into public.empire_dimensions (id, name, description, higher_is_better, category, display_order) values
  ('debt_burden','Debt Burden','Sovereign debt as share of GDP and debt service cost',false,'Economic',1),
  ('expected_growth','Expected Growth','Forward GDP growth projections',true,'Economic',2),
  ('internal_conflict','Internal Conflict','Civil strife, political instability, protest intensity',false,'Social',3),
  ('education','Education','Attainment, completion, and skills outcomes',true,'Fundamentals',4),
  ('innovation_technology','Innovation & Technology','R&D spending, patents, researchers per capita',true,'Fundamentals',5),
  ('cost_competition','Cost Competition','Unit labor cost and price competitiveness',true,'Economic',6),
  ('military_strength','Military Strength','Defense spending, personnel, force projection',true,'Power Projection',7),
  ('trade','Trade','Share of world exports and trade integration',true,'Economic',8),
  ('economic_output','Economic Output','GDP (current and PPP), share of world GDP',true,'Economic',9),
  ('markets_financial_center','Markets & Financial Center','Equity market cap, financial services depth',true,'Power Projection',10),
  ('reserve_currency','Reserve Currency','Share of global FX reserves and payments',true,'Power Projection',11),
  ('geology','Geology','Resource endowment: arable land, minerals, energy reserves',true,'Fundamentals',12),
  ('resource_efficiency','Resource Efficiency','Energy and resource productivity per GDP unit',true,'Fundamentals',13),
  ('infrastructure','Infrastructure','Transport, digital, energy infrastructure quality',true,'Fundamentals',14),
  ('character_social_contracts','Character and Social Contracts','Civic cohesion, institutional trust, corruption',true,'Social',15),
  ('rule_of_law','Rule of Law','Legal system quality, enforcement, property rights',true,'Social',16),
  ('wealth_gaps','Wealth Gaps','Income and wealth inequality (Gini and top-decile share)',false,'Social',17),
  ('acts_of_nature','Acts of Nature','Climate-risk exposure and disaster vulnerability',false,'Fundamentals',18)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  higher_is_better = excluded.higher_is_better,
  category = excluded.category,
  display_order = excluded.display_order;

-- ─── 3. Metric map (World Bank + placeholders) ───────────────────────────────
insert into public.dimension_metric_map (dimension_id, metric_id, source, weight, invert) values
  -- Economic Output (3 metrics, GDP-PPP per capita gets half weight)
  ('economic_output','gdp_current_usd','world_bank',1.0,false),
  ('economic_output','gdp_ppp_current','world_bank',1.0,false),
  ('economic_output','gdp_per_capita_ppp','world_bank',0.5,false),

  -- Expected Growth
  ('expected_growth','gdp_growth_annual','world_bank',1.0,false),

  -- Debt Burden (higher raw = worse, so invert)
  ('debt_burden','central_gov_debt_pct_gdp','world_bank',1.0,true),
  ('debt_burden','external_debt_stocks_pct_gni','world_bank',0.5,true),

  -- Trade
  ('trade','exports_pct_gdp','world_bank',0.5,false),
  ('trade','merchandise_exports_usd','world_bank',1.0,false),

  -- Education
  ('education','school_enrollment_tertiary','world_bank',1.0,false),
  ('education','adult_literacy_rate','world_bank',1.0,false),
  ('education','expenditure_on_education_pct_gdp','world_bank',0.5,false),

  -- Innovation & Technology
  ('innovation_technology','rd_expenditure_pct_gdp','world_bank',1.0,false),
  ('innovation_technology','researchers_per_million','world_bank',1.0,false),
  ('innovation_technology','high_tech_exports_pct','world_bank',0.5,false),

  -- Infrastructure
  ('infrastructure','access_to_electricity','world_bank',0.5,false),
  ('infrastructure','internet_users_pct','world_bank',1.0,false),
  ('infrastructure','mobile_subscriptions_per_100','world_bank',0.5,false),

  -- Military Strength (basic — enrich with SIPRI later)
  ('military_strength','military_expenditure_pct_gdp','world_bank',1.0,false),
  ('military_strength','armed_forces_personnel','world_bank',0.5,false),

  -- Wealth Gaps (higher Gini = worse, invert)
  ('wealth_gaps','gini_index','world_bank',1.0,true),

  -- Cost Competition (proxied by labor force participation + inflation control)
  ('cost_competition','labor_force_participation','world_bank',0.5,false),
  ('cost_competition','inflation_cpi','world_bank',0.5,true),

  -- Resource Efficiency
  ('resource_efficiency','energy_use_per_gdp','world_bank',1.0,true),
  ('resource_efficiency','co2_emissions_per_gdp','world_bank',0.5,true),

  -- Placeholders — these dimensions stay visible with a "data source pending"
  -- state until we wire IMF / SIPRI / WIPO / UNESCO / WJP / TI / V-Dem etc.
  ('internal_conflict','placeholder_conflict_index','placeholder',1.0,false),
  ('markets_financial_center','placeholder_market_cap','placeholder',1.0,false),
  ('reserve_currency','placeholder_reserve_share','placeholder',1.0,false),
  ('geology','placeholder_resource_endowment','placeholder',1.0,false),
  ('character_social_contracts','placeholder_trust_index','placeholder',1.0,false),
  ('rule_of_law','placeholder_rule_of_law_index','placeholder',1.0,false),
  ('acts_of_nature','placeholder_climate_risk','placeholder',1.0,true)
on conflict (dimension_id, metric_id, source) do update set
  weight = excluded.weight,
  invert = excluded.invert;

notify pgrst, 'reload schema';
