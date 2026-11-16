'use client';

import { createContext, useContext } from 'react';

/**
 * Defaults for "Save to your fund" under a run started from Sonar Research:
 * the pitch the run was started for, so the save dialog has it chosen. The
 * member can change it; the server checks the pitch again on save.
 */
export const OrgSonarSaveDefaults = createContext({ pitchId: null });

export const useOrgSonarSaveDefaults = () => useContext(OrgSonarSaveDefaults);
