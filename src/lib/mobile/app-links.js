/**
 * Deep-link verification documents for the iOS and Android apps. Pure, so
 * scripts/check-mobile.mjs can test them. Both return null until the
 * identifiers are configured, and the routes answer 404 in that case.
 */

export const APP_ID = 'world.ezana.app';

/** Paths the apps open directly (Universal Links and App Links). */
export const APP_LINK_PATHS = ['/datasets/*', '/ezana-echo/*', '/community/*', '/home'];

export function appleAppSiteAssociation(teamId) {
  const team = String(teamId || '').trim();
  if (!/^[A-Z0-9]{10}$/.test(team)) return null;
  return {
    applinks: {
      details: [
        {
          appIDs: [`${team}.${APP_ID}`],
          components: APP_LINK_PATHS.map((p) => ({ '/': p })),
        },
      ],
    },
    webcredentials: { apps: [`${team}.${APP_ID}`] },
  };
}

/** One or more SHA-256 fingerprints, comma separated, AA:BB:... form. */
export function assetLinks(certSha256) {
  const prints = String(certSha256 || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  if (!prints.length) return null;
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: APP_ID,
        sha256_cert_fingerprints: prints,
      },
    },
  ];
}
