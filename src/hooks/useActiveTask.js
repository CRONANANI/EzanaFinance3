'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useChecklist } from '@/hooks/useChecklist';
import { CHECKLIST_TASKS } from '@/config/checklist';

const MAX_TARGET_RETRIES = 50;

export function useActiveTask() {
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { completeTask, isTaskComplete, refresh } = useChecklist();
  const router = useRouter();
  const pathname = usePathname();

  const observerRef = useRef(null);
  const finishingRef = useRef(false);
  const detectionCleanupRef = useRef(null);

  const activeTask = activeTaskId ? CHECKLIST_TASKS[activeTaskId] : null;

  const handleCompletion = useCallback(() => {
    if (!activeTaskId || finishingRef.current) return;
    const task = CHECKLIST_TASKS[activeTaskId];
    if (!task) return;
    finishingRef.current = true;
    try {
      completeTask(activeTaskId);
      setToastMessage(task.completionMessage || 'Task completed!');
      setShowToast(true);
      setShowGuide(false);
      setActiveTaskId(null);
      refresh?.();
    } finally {
      finishingRef.current = false;
    }
  }, [activeTaskId, completeTask, refresh]);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    setActiveTaskId(null);
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (typeof detectionCleanupRef.current === 'function') {
      detectionCleanupRef.current();
      detectionCleanupRef.current = null;
    }
  }, []);

  const startTask = useCallback(
    (taskId) => {
      const task = CHECKLIST_TASKS[taskId];
      if (!task || isTaskComplete(taskId)) return;

      setActiveTaskId(taskId);
      setShowGuide(false);

      const go = () => setShowGuide(true);

      if (pathname !== task.page) {
        router.push(task.page);
        setTimeout(go, 900);
      } else {
        setTimeout(go, 450);
      }
    },
    [pathname, router, isTaskComplete]
  );

  /* DOM / interaction completion */
  useEffect(() => {
    if (!activeTask || !showGuide) return;
    if (finishingRef.current) return;

    const { guide, completionTrigger } = activeTask;
    const targetSelector = guide?.targetSelector;
    if (!targetSelector) return;

    if (typeof detectionCleanupRef.current === 'function') {
      detectionCleanupRef.current();
      detectionCleanupRef.current = null;
    }

    let retries = 0;
    let cancelled = false;

    const cleanupFns = [];

    const run = () => {
      if (cancelled || finishingRef.current) return;

      const target = document.querySelector(targetSelector);
      if (!target) {
        if (retries++ < MAX_TARGET_RETRIES) {
          setTimeout(run, 200);
        }
        return;
      }

      switch (completionTrigger) {
        case 'click':
        case 'navigation': {
          const onClick = () => {
            setTimeout(() => {
              if (!cancelled && !finishingRef.current) handleCompletion();
            }, 350);
          };
          target.addEventListener('click', onClick, { once: true });
          cleanupFns.push(() => target.removeEventListener('click', onClick));
          break;
        }

        case 'search': {
          const onKeydown = (e) => {
            if (e.key === 'Enter' && target.value && String(target.value).trim()) {
              setTimeout(() => {
                if (!cancelled && !finishingRef.current) handleCompletion();
              }, 300);
            }
          };
          target.addEventListener('keydown', onKeydown);
          cleanupFns.push(() => target.removeEventListener('keydown', onKeydown));

          const form = target.closest('form');
          const searchBtn =
            form?.querySelector('button[type="submit"]') ||
            target.parentElement?.querySelector('button') ||
            target.nextElementSibling?.querySelector?.('button');
          if (searchBtn) {
            const onBtn = () => {
              if (target.value && String(target.value).trim()) {
                setTimeout(() => {
                  if (!cancelled && !finishingRef.current) handleCompletion();
                }, 300);
              }
            };
            searchBtn.addEventListener('click', onBtn, { once: true });
            cleanupFns.push(() => searchBtn.removeEventListener('click', onBtn));
          }
          break;
        }

        case 'scroll-into-view': {
          const observer = new IntersectionObserver(
            (entries) => {
              if (!entries[0]?.isIntersecting) return;
              const t = setTimeout(() => {
                if (!cancelled && !finishingRef.current) {
                  handleCompletion();
                  observer.disconnect();
                }
              }, 1200);
              cleanupFns.push(() => clearTimeout(t));
            },
            { threshold: 0.35 }
          );
          observer.observe(target);
          observerRef.current = observer;
          cleanupFns.push(() => observer.disconnect());
          break;
        }

        default:
          break;
      }

      detectionCleanupRef.current = () => {
        cleanupFns.forEach((fn) => {
          try {
            fn();
          } catch {
            /* ignore */
          }
        });
      };
    };

    const t = setTimeout(run, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (typeof detectionCleanupRef.current === 'function') {
        detectionCleanupRef.current();
        detectionCleanupRef.current = null;
      }
    };
  }, [activeTask, showGuide, handleCompletion]);

  return {
    activeTask,
    activeTaskId,
    showGuide,
    showToast,
    toastMessage,
    startTask,
    dismissGuide,
    setShowToast,
  };
}
