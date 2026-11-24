# 09 · Implementation roadmap

## Where every capability stands (24 Nov 2026)

| Class                       | Items                                                                                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Production-ready (live)** | `/v1/alpha/signals`, `/v1/alpha/signals/{signal_id}`, `/v1/alpha/procurement-acceleration`                                                                                                                                                                       |
| **Validated descriptive**   | procurement_acceleration v1.0.0 (calibrated null, BH q-values, leakage tests)                                                                                                                                                                                    |
| **Research prototype**      | none shipped; congressional flow to forward returns is ready to start (internal)                                                                                                                                                                                 |
| **Needs more history**      | insider_behavior_anomaly (Form 4: 54 of 730 days), lobbying_procurement_leadlag (2 of 5 years), event calibration (35 of 365 days)                                                                                                                               |
| **Needs data integration**  | institutional_divergence, ownership_confirmation, capital_crowding, sector_rotation_pressure (13F Q3 parsed 9.4%), innovation_capital_divergence (patents empty), macro_regime_shift (no release dates or vintages), geopolitical_exposure (no verified mapping) |
| **Blocked by licensing**    | any public output derived from FMP prices                                                                                                                                                                                                                        |
| **Rejected by validation**  | none tested yet; raw \|robust z\| > 3 rejected as an "unusual" rule (6.9% to 15.1% false-flag rate on noise)                                                                                                                                                     |

## Next steps, in order

1. **Finish Q3 2026 13F holdings parsing** (148 of 1,575 filers). The 13F gates in `/v1/alpha/signals` open on their
   own when parsing reaches 80% and 500 comparable filers; then build institutional_divergence on the same
   contract, using `first_filed_at` as `available_at`.
2. **Start recording history now: signal snapshots.** History is the main blocker, and only stored history
   becomes point-in-time. Add `alpha_signal_snapshots` (signal_id, version, entity, period, available_at,
   evaluated_at, value, metrics jsonb, data_synced_at; unique on signal, version, entity, period, evaluated_at)
   and a daily cron that writes each live signal's rows. This also gives `/v1/alpha/signals/{id}/history` and is
   stage 1 of the alert lifecycle (06). Write it as an additive migration for the SQL Editor.
3. **Keep vintages for slow sources**: snapshot `company_contract_history` per sync (or store only changed rows)
   so FY totals can be read as they stood on any date; store macro release dates.
4. **Run the congressional flow study internally** (04, last section): the one combination with 12 years of
   point-in-time history.
5. **Apply or remove the eight data-less routes** listed in 01 (events view, patents, night lights).
6. **Alerts** per 06 once snapshots exist; webhooks only with signing, retries and dead-lettering.
7. **Internal adapters**: read signal services directly (not the billed API) from Sonar (with observed vs
   derived vs hypothesis labels), Research Composer (typed parameters) and Quant Lab.
8. **Entitlement packaging** (07) after approval.

## Re-uploading the Google gateway config

New routes are reachable at `ezana.world/v1/...` as soon as Vercel deploys, but `api.ezana.world` only forwards
paths in its uploaded spec. After any registry change:

```bash
node --import ./scripts/register-sonar-loader.mjs scripts/gcp/export-gateway-spec.mjs > ezana-gateway.json
gcloud api-gateway api-configs create ezana-v1-YYYYMMDD --api=ezana-api --openapi-spec=ezana-gateway.json \
  --backend-auth-service-account=ezana-gateway@ezana-data.iam.gserviceaccount.com --project=ezana-data
gcloud api-gateway gateways update ezana-gw --api=ezana-api --api-config=ezana-v1-YYYYMMDD \
  --location=us-east4 --project=ezana-data
```
