/**
 * The in-app nav takes the Sonar loader's ground while a loader is up
 * (body.sonar-ping-active, nav-sonar-dark.css) and returns to the page's ground the moment
 * the last one goes. Every loader holds one claim (SonarPingLoader, SonarLoadingState), so
 * the class can never outlive them, whichever unmounts first. Nov 27 2026.
 */
let claims = 0;

export function claimPingGround() {
  if (typeof document === 'undefined') return () => {};
  claims += 1;
  document.body.classList.add('sonar-ping-active');
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims = Math.max(0, claims - 1);
    if (!claims) document.body.classList.remove('sonar-ping-active');
  };
}
