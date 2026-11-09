import ErrorScreen from '@/components/errors/ErrorScreen';

/* 404: the branded "Wandered off" screen (design C), full bleed and light.
   ErrorScreen.css hides the global nav and the phone sign-up bar while it is
   mounted; the same component renders every error state in the app. */

export const metadata = {
  title: 'Page not found | Ezana',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <ErrorScreen variant="not-found" />;
}
