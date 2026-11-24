# 06 · Alert architecture (designed, not built)

No alert, subscription or webhook route is published, because the backend for them does not exist yet and the
registry only lists what it serves. The `/v1/predictions/alerts` route was already removed for the same reason
(see `docs/ezana-api-backlog.md`). This is the design to build against.

## Lifecycle (each stage is separate)

1. **Calculation**: a scheduled job evaluates each live signal version and writes one immutable row per entity
   and period to `alpha_signal_snapshots` (see roadmap, Phase 2). This is also what makes history and
   point-in-time evaluation possible.
2. **Eligibility**: the row passes freshness (data synced within the signal's stated cadence), coverage
   (minimum sample) and status (`evaluated`) checks.
3. **Qualification**: the row crosses a documented, calibrated rule. For procurement acceleration:
   `q_value <= 0.10` within its fiscal-year family, a material change from the last snapshot, and the direction a
   subscriber asked for. Thresholds are stored with a version; "high confidence" is never used without evidence.
4. **Generation**: one alert per (signal, version, entity, period, rule), deduplicated by that key.
5. **Delivery**: pull (`GET /v1/alpha/alerts`) and, where approved, webhooks.
6. **Acknowledgement**: delivery status and receipt per subscription.

## Severity

| Level         | Meaning                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------- |
| informational | A new evaluation is available (new fiscal year, new quarter)                                      |
| elevated      | Qualifies by its calibrated rule (for example q <= 0.10)                                          |
| significant   | Qualifies at a stricter rule (for example q <= 0.05) and agrees with the prior period's direction |
| critical_data | A data or risk change (a source stalls, a gate closes, a signal version is withdrawn)             |

Severity describes the statistical and data condition, never a trading opportunity.

## Routes (to publish only once built)

`GET /v1/alpha/alerts`, `GET /v1/alpha/alerts/{id}`, `GET /v1/alpha/signals/{signal_id}/history`,
`POST /v1/alpha/alert-subscriptions`, `GET /v1/alpha/alert-subscriptions`,
`DELETE /v1/alpha/alert-subscriptions/{id}`. The router accepts GET only today; subscriptions need POST and
DELETE support in `src/app/api/v1/[...path]/route.js`, scoped to the calling key.

## Webhooks (requirements before any webhook ships)

Subscriptions owned by a key; payloads signed with HMAC-SHA256 over the raw body with a per-subscription secret
(rotatable, two secrets valid during rotation); `delivery_id` and `alert_id` for idempotency; retries with
exponential backoff for 24 hours, then a dead-letter table; per-key subscription and delivery limits; delivery
status and audit log per attempt. Reliable real-time delivery is not claimed until this exists.

## Payload (fields populated only from verified calculations)

```json
{
  "event": "alpha.signal_qualified",
  "alert_id": "<uuid>",
  "delivery_id": "<uuid>",
  "signal_id": "procurement_acceleration",
  "signal_version": "1.0.0",
  "entity": { "ticker": "<ticker>" },
  "period": "<as_of>",
  "available_at": "<date>",
  "evaluated_at": "<timestamp>",
  "severity": "elevated",
  "rule": "q_value <= 0.10",
  "evidence": { "value": null, "q_value": null, "metrics": {} },
  "limitations": []
}
```
