/**
 * Stage-view matrix (spec §5.1) — data, not scattered `if`s. Drives which tabs
 * show, the default tab, each thesis/data/deliverables/discussion sub-section's
 * mode per stage, and which stage-specific panels appear.
 *
 * Section modes: 'hidden' | 'readonly' | 'editable' | 'required'
 *   plus a few spec-specific literals: 'base_only', 'all_required', 'visible',
 *   'optional', 'open', 'locked', 'reopened', 'active', 'closed', 'checked',
 *   'actual'. Consumers treat anything in {editable, required, base_only,
 *   all_required, optional, open, active} as writable.
 *
 * Thesis freezes at cross_desk_review (core → readonly). That is the whole
 * point: cross-desk PMs and the IC vote on a thesis that cannot change.
 */

const WRITABLE = new Set([
  'editable',
  'required',
  'base_only',
  'all_required',
  'optional',
  'open',
  'active',
]);

// Per-stage: tabs shown, default tab, section modes, stage panels.
export const STAGE_VIEWS = {
  idea: {
    tabs: ['thesis', 'data'],
    defaultTab: 'thesis',
    sections: {
      'thesis.core': 'editable',
      'thesis.variant_perception': 'hidden',
      'thesis.falsification': 'hidden',
      'thesis.targets': 'hidden',
      'thesis.sizing': 'hidden',
      'data.comps': 'hidden',
      'data.financials': 'hidden',
      'deliverables.models': 'hidden',
      'deliverables.deck': 'hidden',
      'discussion.challenges': 'hidden',
      'discussion.straw_poll': 'hidden',
    },
    panels: [],
  },
  screening: {
    tabs: ['thesis', 'data', 'discussion'],
    defaultTab: 'thesis',
    sections: {
      'thesis.core': 'editable',
      'thesis.variant_perception': 'editable',
      'thesis.falsification': 'editable',
      'thesis.targets': 'base_only',
      'thesis.sizing': 'hidden',
      'data.comps': 'readonly',
      'data.financials': 'visible',
      'deliverables.models': 'optional',
      'deliverables.deck': 'hidden',
      'discussion.challenges': 'open',
      'discussion.straw_poll': 'hidden',
    },
    panels: ['signoff'],
  },
  deep_dive: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion'],
    defaultTab: 'deliverables',
    sections: {
      'thesis.core': 'editable',
      'thesis.variant_perception': 'required',
      'thesis.falsification': 'required',
      'thesis.targets': 'all_required',
      'thesis.sizing': 'required',
      'data.comps': 'editable',
      'data.financials': 'visible',
      'deliverables.models': 'required',
      'deliverables.deck': 'optional',
      'discussion.challenges': 'open',
      'discussion.straw_poll': 'hidden',
    },
    panels: ['desk_meeting', 'model_checklist'],
  },
  cross_desk_review: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion'],
    defaultTab: 'discussion',
    sections: {
      'thesis.core': 'readonly', // FROZEN
      'thesis.variant_perception': 'readonly',
      'thesis.falsification': 'readonly',
      'thesis.targets': 'readonly',
      'thesis.sizing': 'readonly',
      'data.comps': 'readonly',
      'data.financials': 'visible',
      'deliverables.models': 'readonly',
      'deliverables.deck': 'optional',
      'discussion.challenges': 'open',
      'discussion.straw_poll': 'hidden',
    },
    panels: ['cross_desk'],
  },
  pitch_scheduled: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion'],
    defaultTab: 'deliverables',
    sections: {
      'thesis.core': 'readonly',
      'thesis.variant_perception': 'readonly',
      'thesis.falsification': 'readonly',
      'thesis.targets': 'readonly',
      'thesis.sizing': 'readonly',
      'data.comps': 'readonly',
      'data.financials': 'visible',
      'deliverables.models': 'readonly',
      'deliverables.deck': 'required',
      'discussion.challenges': 'open',
      'discussion.straw_poll': 'active',
    },
    panels: ['pre_read'],
  },
  ic_vote: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion'],
    defaultTab: 'thesis',
    sections: {
      'thesis.core': 'readonly',
      'thesis.variant_perception': 'readonly',
      'thesis.falsification': 'readonly',
      'thesis.targets': 'readonly',
      'thesis.sizing': 'readonly',
      'data.comps': 'readonly',
      'data.financials': 'visible',
      'deliverables.models': 'readonly',
      'deliverables.deck': 'readonly',
      'discussion.challenges': 'locked',
      'discussion.straw_poll': 'closed',
    },
    panels: ['vote'],
  },
  approved: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion'],
    defaultTab: 'thesis',
    sections: {
      'thesis.core': 'readonly',
      'data.financials': 'visible',
      'discussion.challenges': 'locked',
    },
    panels: ['vote'],
  },
  in_portfolio: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion', 'performance'],
    defaultTab: 'performance',
    sections: {
      'thesis.core': 'readonly',
      'thesis.falsification': 'checked',
      'thesis.sizing': 'actual',
      'data.financials': 'visible',
      'discussion.challenges': 'reopened',
    },
    panels: ['performance'],
  },
  exited: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion', 'performance'],
    defaultTab: 'performance',
    sections: { 'thesis.core': 'readonly', 'data.financials': 'visible' },
    panels: ['performance'],
  },
  rejected: {
    tabs: ['thesis', 'data', 'deliverables', 'discussion'],
    defaultTab: 'thesis',
    sections: { 'thesis.core': 'readonly' },
    panels: [],
  },
};

export function stageView(stage) {
  return STAGE_VIEWS[stage] || STAGE_VIEWS.idea;
}

export function stageTabs(stage) {
  return stageView(stage).tabs;
}

export function stageDefaultTab(stage) {
  return stageView(stage).defaultTab;
}

export function stagePanels(stage) {
  return stageView(stage).panels || [];
}

/** Section mode for a stage — defaults to 'readonly' for unlisted sections. */
export function sectionMode(stage, section) {
  return stageView(stage).sections[section] || 'readonly';
}

export function isSectionWritable(stage, section) {
  return WRITABLE.has(sectionMode(stage, section));
}

export function isSectionVisible(stage, section) {
  return sectionMode(stage, section) !== 'hidden';
}
