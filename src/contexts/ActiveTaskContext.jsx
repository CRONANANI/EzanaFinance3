'use client';

import { createContext, useContext } from 'react';
import { useActiveTask } from '@/hooks/useActiveTask';
import { TaskGuide } from '@/components/TaskGuide';
import { TaskCompletionToast } from '@/components/TaskCompletionToast';

const ActiveTaskContext = createContext(null);

function ActiveTaskOverlay() {
  const { activeTask, showGuide, showToast, toastMessage, dismissGuide, setShowToast } =
    useActiveTaskContext();

  return (
    <>
      {activeTask && showGuide && (
        <TaskGuide
          targetSelector={activeTask.guide.targetSelector}
          message={activeTask.guide.message}
          position={activeTask.guide.position || 'top'}
          onDismiss={dismissGuide}
          visible={showGuide}
        />
      )}
      <TaskCompletionToast
        message={toastMessage}
        visible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  );
}

export function ActiveTaskProvider({ children }) {
  const activeTaskState = useActiveTask();

  return (
    <ActiveTaskContext.Provider value={activeTaskState}>
      <ActiveTaskOverlay />
      {children}
    </ActiveTaskContext.Provider>
  );
}

/**
 * For components that can render OUTSIDE the dashboard, the root Navbar above
 * all. The provider mounts the task guide overlay, which belongs to the
 * dashboard, so it stays where it is; a component that the root layout renders
 * on every page asks for the context optionally and copes with null.
 *
 * This is the fix for a real crash: the Navbar renders the checklist icon for
 * any signed-in visitor, so on the landing page, the datasets pages, Echo and
 * the help center the throwing hook below fired on every render.
 */
export function useOptionalActiveTaskContext() {
  return useContext(ActiveTaskContext);
}

export function useActiveTaskContext() {
  const ctx = useContext(ActiveTaskContext);
  if (!ctx) {
    throw new Error('useActiveTaskContext must be used within ActiveTaskProvider');
  }
  return ctx;
}
