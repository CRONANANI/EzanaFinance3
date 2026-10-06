/**
 * Where the iOS and Android apps send features that are web-only in v1
 * (real-money brokerage trading and account linking). No link and no price:
 * store rules forbid steering buyers outside the app. Browsers never land here
 * through the middleware; a direct visit just reads the same line.
 */
export const metadata = { title: 'Available on ezana.world | Ezana', robots: { index: false } };

export default function WebOnlyPage() {
  return (
    <main id="main-content" className="native-web-only-page">
      <p className="native-web-only">Available on ezana.world</p>
    </main>
  );
}
