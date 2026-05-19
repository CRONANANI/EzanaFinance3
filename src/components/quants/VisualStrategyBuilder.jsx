'use client';

import { useState } from 'react';
import {
  CONDITION_CATEGORIES,
  ACTION_OPTIONS,
  SIZING_OPTIONS,
  EXIT_RULES,
} from '@/lib/for-the-quants-mock-data';

export function VisualStrategyBuilder({ onSave }) {
  const [strategyName, setStrategyName] = useState('');
  const [conditions, setConditions] = useState([
    { id: Date.now(), categoryIdx: 0, conditionIdx: 0, params: {}, logic: 'AND' },
  ]);
  const [action, setAction] = useState('buy');
  const [sizing, setSizing] = useState('equal_weight');
  const [exitRule, setExitRule] = useState('trailing_stop_10');

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { id: Date.now(), categoryIdx: 0, conditionIdx: 0, params: {}, logic: 'AND' },
    ]);
  };

  const removeCondition = (id) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCondition = (id, field, value) => {
    setConditions((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              [field]: value,
              ...(field === 'categoryIdx' ? { conditionIdx: 0, params: {} } : {}),
            }
          : c,
      ),
    );
  };

  const toggleLogic = (id) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, logic: c.logic === 'AND' ? 'OR' : 'AND' } : c)),
    );
  };

  const updateParam = (condId, paramName, value) => {
    setConditions((prev) =>
      prev.map((c) =>
        c.id === condId ? { ...c, params: { ...c.params, [paramName]: value } } : c,
      ),
    );
  };

  const handleSave = () => {
    onSave?.({
      name: strategyName || 'Untitled Strategy',
      conditions: conditions.map((c) => {
        const cat = CONDITION_CATEGORIES[c.categoryIdx];
        const cond = cat?.conditions?.[c.conditionIdx];
        return { category: cat?.label, condition: cond?.label, params: c.params, logic: c.logic };
      }),
      action,
      sizing,
      exitRule,
    });
  };

  return (
    <div className="ftq-vb">
      <input
        className="ftq-vb-name"
        placeholder="Strategy name…"
        value={strategyName}
        onChange={(e) => setStrategyName(e.target.value)}
      />

      <div className="ftq-vb-section-label">
        <i className="bi bi-funnel" /> CONDITIONS
      </div>

      {conditions.map((cond, idx) => {
        const cat = CONDITION_CATEGORIES[cond.categoryIdx] || CONDITION_CATEGORIES[0];
        const selectedCond = cat.conditions[cond.conditionIdx] || cat.conditions[0];
        return (
          <div key={cond.id} className="ftq-vb-rule">
            {idx === 0 ? (
              <span className="ftq-vb-keyword">IF</span>
            ) : (
              <button
                type="button"
                className="ftq-vb-logic-toggle"
                onClick={() => toggleLogic(cond.id)}
                title={`Click to switch to ${cond.logic === 'AND' ? 'OR' : 'AND'}`}
              >
                {cond.logic}
              </button>
            )}
            <select
              className="ftq-vb-select"
              value={cond.categoryIdx}
              onChange={(e) => updateCondition(cond.id, 'categoryIdx', Number(e.target.value))}
            >
              {CONDITION_CATEGORIES.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              className="ftq-vb-select ftq-vb-select--wide"
              value={cond.conditionIdx}
              onChange={(e) => updateCondition(cond.id, 'conditionIdx', Number(e.target.value))}
            >
              {cat.conditions.map((c, i) => (
                <option key={c.id} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
            {selectedCond.params.map((p) => (
              <span key={p.name} className="ftq-vb-param">
                <span className="ftq-vb-param-label">{p.name}:</span>
                {p.type === 'select' ? (
                  <select
                    className="ftq-vb-select ftq-vb-select--sm"
                    value={cond.params[p.name] ?? p.default}
                    onChange={(e) => updateParam(cond.id, p.name, e.target.value)}
                  >
                    {p.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    className="ftq-vb-input-sm"
                    value={cond.params[p.name] ?? p.default}
                    onChange={(e) => updateParam(cond.id, p.name, e.target.value)}
                  />
                )}
              </span>
            ))}
            {conditions.length > 1 && (
              <button
                type="button"
                className="ftq-vb-remove"
                onClick={() => removeCondition(cond.id)}
                aria-label="Remove condition"
              >
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        );
      })}

      <button type="button" className="ftq-btn-ghost ftq-vb-add" onClick={addCondition}>
        <i className="bi bi-plus-circle" /> Add Condition
      </button>

      <div className="ftq-vb-section-label">
        <i className="bi bi-lightning" /> THEN
      </div>
      <div className="ftq-vb-action-row">
        {ACTION_OPTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`ftq-vb-action-btn ${action === a.id ? 'active' : ''}`}
            onClick={() => setAction(a.id)}
          >
            <i className={`bi ${a.icon}`} /> {a.label}
          </button>
        ))}
      </div>

      <div className="ftq-vb-config-row">
        <div className="ftq-vb-config-group">
          <span className="ftq-vb-config-label">Position Size</span>
          <select
            className="ftq-vb-select"
            value={sizing}
            onChange={(e) => setSizing(e.target.value)}
          >
            {SIZING_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ftq-vb-config-group">
          <span className="ftq-vb-config-label">Exit Rule</span>
          <select
            className="ftq-vb-select"
            value={exitRule}
            onChange={(e) => setExitRule(e.target.value)}
          >
            {EXIT_RULES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ftq-vb-summary">
        <div className="ftq-vb-summary-label">Strategy Summary</div>
        <p className="ftq-vb-summary-text">
          <strong>IF</strong>{' '}
          {conditions
            .map((c, i) => {
              const cat = CONDITION_CATEGORIES[c.categoryIdx];
              const cond = cat?.conditions?.[c.conditionIdx];
              return `${i > 0 ? ` ${c.logic} ` : ''}${cond?.label || '?'}`;
            })
            .join('')}{' '}
          <strong>THEN</strong> {ACTION_OPTIONS.find((a) => a.id === action)?.label}
          {' · '}
          {SIZING_OPTIONS.find((s) => s.id === sizing)?.label}
          {' · Exit: '}
          {EXIT_RULES.find((r) => r.id === exitRule)?.label}
        </p>
      </div>

      <div className="ftq-vb-footer">
        <button type="button" className="ftq-btn-primary" onClick={handleSave}>
          <i className="bi bi-floppy" /> Save Strategy
        </button>
        <button type="button" className="ftq-btn-primary ftq-btn-primary--accent">
          <i className="bi bi-play" /> Run Backtest
        </button>
      </div>
    </div>
  );
}
