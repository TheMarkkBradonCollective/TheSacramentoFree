const configuredLabel = String(
  (import.meta as { env?: Record<string, string> }).env?.VITE_APP_BETA_VERSION_LABEL || '',
).trim();

/** Beta label shown on the boot splash, e.g. "beta v0.1.0.0003". */
export function getBetaVersionLabel(): string {
  return configuredLabel || 'beta v0.1.0.0000';
}
