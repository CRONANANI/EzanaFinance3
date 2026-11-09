'use client';

/**
 * [D] Tool picker: a row of pills under the section tabs, shown only on the
 * Models and Valuation tabs. The grouping lives in TAB_TOOLS
 * (src/lib/research/company-research.js); the page mirrors the selection to
 * ?tool= so pins, deep links and the back button work.
 */
import { getModelConfig } from '@/lib/ai/analysis-prompts';
import { PREMIUM_TOOL_IDS, TAB_TOOLS } from '@/lib/research/company-research';

export function ToolPicker({ section, tool, onSelect }) {
  const cfg = TAB_TOOLS[section];
  if (!cfg) return null;
  return (
    <div className="rc-picker" role="group" aria-label={`${cfg.label} tools`}>
      <span className="rc-picker__label" aria-hidden="true">
        {cfg.label}
      </span>
      {cfg.tools.map((id) => {
        const model = getModelConfig(id);
        const name = model?.name || id;
        const on = id === tool;
        const premium = PREMIUM_TOOL_IDS.has(id);
        return (
          <button
            key={id}
            type="button"
            data-model={id}
            className={`rc-pill${on ? ' is-on' : ''}`}
            aria-pressed={on}
            onClick={() => onSelect(id)}
          >
            {model?.icon ? <i className={`bi ${model.icon}`} aria-hidden="true" /> : null}
            {name}
            {premium ? (
              <i className="bi bi-star-fill rc-pill__star" role="img" aria-label="Premium" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default ToolPicker;
