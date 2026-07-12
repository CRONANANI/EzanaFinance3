'use client';

import dynamic from 'next/dynamic';
import { useOrg } from '@/contexts/OrgContext';
import { OrgNotificationPrefs } from './OrgNotificationPrefs';

/* NotificationsPanel lives in the large SettingsPanels.jsx module; defer it so
   that module stays out of the initial /settings chunk (it must be dynamic in
   every importer). Reserved height keeps CLS≈0 while it loads. Named export. */
const NotificationsPanel = dynamic(
  () =>
    import('@/components/settings/SettingsPanels').then((m) => ({ default: m.NotificationsPanel })),
  { loading: () => <div aria-hidden style={{ minHeight: 480, width: '100%' }} /> },
);

/* Notifications panel + (for org members) the role-filtered council
   notification preferences appended below. */
export function NotificationsWithOrg(props) {
  const { isOrgUser } = useOrg();
  return (
    <>
      <NotificationsPanel {...props} />
      {isOrgUser ? <OrgNotificationPrefs /> : null}
    </>
  );
}
