'use client';

import { NotificationsPanel } from '@/components/settings/SettingsPanels';
import { useOrg } from '@/contexts/OrgContext';
import { OrgNotificationPrefs } from './OrgNotificationPrefs';

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
