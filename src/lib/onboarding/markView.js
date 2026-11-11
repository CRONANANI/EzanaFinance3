'use client';

/**
 * Report a page-view checklist task (see VIEW_TASK_IDS). Fire-and-forget:
 * posts once per task per browser session, then tells the checklist panel
 * to refresh. Never throws.
 */
import { isViewTaskId } from '@/lib/onboarding/checklistConfig';

export const CHECKLIST_EVENT = 'gsc-checklist-updated';
const sent = new Set();

export function markChecklistView(taskId) {
  if (typeof window === 'undefined' || !isViewTaskId(taskId) || sent.has(taskId)) return;
  sent.add(taskId);
  fetch('/api/onboarding/checklist/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ taskId }),
  })
    .then((r) => {
      if (r.ok) window.dispatchEvent(new Event(CHECKLIST_EVENT));
      else sent.delete(taskId);
    })
    .catch(() => sent.delete(taskId));
}
