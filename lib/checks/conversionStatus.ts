// Google Ads conversion action status matching.
//
// Google Ads never exports a status of "Disabled". The sources:
// - Google Ads API ConversionActionStatus: ENABLED ("Conversions will be
//   recorded."), REMOVED ("Conversions will not be recorded."), HIDDEN
//   ("Conversions will not be recorded and the conversion action will not
//   appear in the UI.").
//   https://developers.google.com/google-ads/api/reference/rpc/latest/ConversionActionStatusEnum.ConversionActionStatus
// - Google Ads UI Status column (tracking status): Active, Needs attention,
//   Misconfigured, Awaiting conversions, Removed. Older UI labels: Recording
//   conversions, No recent conversions, Unverified, Inactive, Tag inactive.
//   https://support.google.com/google-ads/troubleshooter/13455130
//
// Only Removed and Hidden mean the action is switched off. The tracking-health
// statuses (Inactive, Misconfigured, ...) describe an action that is still
// enabled but whose tag is not recording, so they count as switched on.
// "Disabled" is kept for AdLint's own fixtures and older hand-made exports.

const OFF_STATUSES = new Set(['removed', 'hidden', 'disabled']);

const normalise = (status: string): string => status.trim().toLowerCase();

/** True when the action is switched off: Removed, Hidden, or Disabled. */
export const isConversionActionOff = (status: string): boolean =>
  OFF_STATUSES.has(normalise(status));

/** True when the action is switched on: any non-blank status that is not off. */
export const isConversionActionOn = (status: string): boolean => {
  const s = normalise(status);
  return s !== '' && !OFF_STATUSES.has(s);
};
