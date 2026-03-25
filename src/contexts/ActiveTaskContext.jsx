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

export function useActiveTaskContext() {
  const ctx = useContext(ActiveTaskContext);
  if (!ctx) {
    throw new Error('useActiveTaskContext must be used within ActiveTaskProvider');
  }
  return ctx;
}
