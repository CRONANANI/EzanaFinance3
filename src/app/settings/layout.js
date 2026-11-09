import { SettingsProvider } from '@/contexts/SettingsContext';
import { BeginnerLevelProvider } from '@/contexts/BeginnerLevelContext';

/* /settings lives outside the (dashboard) route group, whose layout is the
   only other place these providers are mounted. The page calls
   useUserSettings() and the Profile panel calls useBeginnerLevelContext();
   both throw without their provider, so every visit crashed into the error
   boundary on the client (Nov 2026 fix). Both providers need only the theme,
   auth and toast contexts, which the root layout supplies. */
export default function SettingsLayout({ children }) {
  return (
    <SettingsProvider>
      <BeginnerLevelProvider>{children}</BeginnerLevelProvider>
    </SettingsProvider>
  );
}
