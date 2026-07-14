/**
 * Stage-view matrix — data that drives which tabs show, the default tab, and
 * each section's mode per stage. Consumed by the modal so stage behaviour is a
 * lookup, not conditionals scattered through JSX.
 *
 * Section modes: 'hidden' | 'readonly' | 'editable' | 'required'.
 * The thesis is 'readonly' from cross_desk_review onward (the freeze).
 */

const ALL_TABS = ['thesis', 'supporting_data', 'deliverables', 'discussion'];

// Stage panels that surface alongside the four content tabs.
const STAGE_PANELS = {
  screening: ['signoff'],
  deep_dive: ['desk_meeting', 'model_checklist'],
  cross_desk_review: ['cross_desk'],
  pitch_scheduled: ['vote'],
  ic_vote: ['vote'],
  approved: ['performance'],
  in_portfolio: ['performance'],
  exited: ['performance'],
  rejected: [],
  idea: [],
};

export const STAGE_VIEWS = {
  idea: {
    tabs: ALL_TABS,
    defaultTab: 'thesis',
    sections: {
      thesis: 'required',
      supporting_data: 'editable',
      deliverables: 'editable',
      discussion: 'editable',
    },
  },
  screening: {
    tabs: ALL_TABS,
    defaultTab: 'thesis',
    sections: {
      thesis: 'editable',
      supporting_data: 'editable',
      deliverables: 'editable',
      discussion: 'editable',
    },
  },
  deep_dive: {
    tabs: ALL_TABS,
    defaultTab: 'supporting_data',
    sections: {
      thesis: 'editable',
      supporting_data: 'required',
      deliverables: 'required',
      discussion: 'editable',
    },
  },
  cross_desk_review: {
    tabs: ALL_TABS,
    defaultTab: 'discussion',
    // FROZEN: thesis becomes read-only — cross-desk PMs vote on a fixed thesis.
    sections: {
      thesis: 'readonly',
      supporting_data: 'readonly',
      deliverables: 'readonly',
      discussion: 'editable',
    },
  },
  pitch_scheduled: {
    tabs: ALL_TABS,
    defaultTab: 'discussion',
    sections: {
      thesis: 'readonly',
      supporting_data: 'readonly',
      deliverables: 'readonly',
      discussion: 'editable',
    },
  },
  ic_vote: {
    tabs: ALL_TABS,
    defaultTab: 'thesis',
    sections: {
      thesis: 'readonly',
      supporting_data: 'readonly',
      deliverables: 'readonly',
      discussion: 'readonly',
    },
  },
  approved: {
    tabs: ALL_TABS,
    defaultTab: 'thesis',
    sections: {
      thesis: 'readonly',
      supporting_data: 'readonly',
      deliverables: 'readonly',
      discussion: 'readonly',
    },
  },
  in_portfolio: {
    tabs: ALL_TABS,
    defaultTab: 'supporting_data',
    sections: {
      thesis: 'readonly',
      supporting_data: 'readonly',
      deliverables: 'readonly',
      discussion: 'editable',
    },
  },
  exited: {
    tabs: ALL_TABS,
    defaultTab: 'thesis',
    sections: {
      thesis: 'readonly',
      supporting_data: 'readonly',
      deliverables: 'readonly',
      discussion: 'readonly',
    },
  },
  rejected: {
    tabs: ALL_TABS,
    defaultTab: 'thesis',
    sections: {
      thesis: 'readonly',
      supporting_data: 'readonly',
      deliverables: 'readonly',
      discussion: 'readonly',
    },
  },
};

export function stageView(stage) {
  return STAGE_VIEWS[stage] || STAGE_VIEWS.idea;
}

export function stagePanels(stage) {
  return STAGE_PANELS[stage] || [];
}

/** Section mode for a stage — defaults to 'readonly' for unknown sections. */
export function sectionMode(stage, section) {
  return stageView(stage).sections[section] || 'readonly';
}

/** Convenience: is a section writable in this stage? */
export function isSectionWritable(stage, section) {
  const m = sectionMode(stage, section);
  return m === 'editable' || m === 'required';
}
