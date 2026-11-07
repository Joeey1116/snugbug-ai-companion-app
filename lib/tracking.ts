/**
 * App Tracking Transparency.
 *
 * The ATT prompt fires on first launch per Apple's requirement.
 * The app has no ads and no third-party tracking SDKs — the IDFA
 * is not used for cross-app tracking.
 *
 * Crash-safety (found Nov 7, 2026): expo-tracking-transparency is
 * NEVER statically imported. A static import made Metro's web
 * bundler resolve the route module to undefined ("Route is missing
 * the required default export", blank white page). It is loaded
 * lazily with a dynamic import inside try/catch, so a missing or
 * broken native module can never break a route — same pattern as
 * lib/notifications.ts.
 */
const TRACKING_ENABLED = true;

export async function maybeRequestTracking(): Promise<boolean> {
  if (!TRACKING_ENABLED) return false;
  try {
    const mod = await import('expo-tracking-transparency');
    const fn = mod?.requestTrackingPermissionsAsync;
    if (typeof fn !== 'function') return false;
    const { status } = await fn();
    return status === 'granted';
  } catch {
    return false;
  }
}
