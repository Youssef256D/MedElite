export const messages = {
  auth: {
    sessionExpired: "Your session has expired. Please sign in again.",
    noPermission: "You do not have permission to access this page.",
    suspended: "Your account has been suspended. Please contact support.",
    invalidCredentials: "The email or password you entered is incorrect.",
    signedOut: "You have been signed out successfully.",
  },
  subscription: {
    required: "Your subscription is required to access this lesson.",
    expired: "Your subscription has expired. Renew to continue watching.",
    previewOnly: "This lesson is available as a preview only.",
    active: "Your subscription is active.",
  },
  devices: {
    limitReached:
      "Too many active devices are linked to your account. Please sign out from another device or contact support.",
    revoked: "The selected session has been revoked.",
  },
  upload: {
    inProgress: "Your video is uploading. Please do not close this page.",
    interrupted: "Upload interrupted. We are trying to resume automatically.",
    processing: "Video processing is still in progress. It will be available soon.",
    playbackFailed: "This video could not be played right now. Please refresh or try again later.",
    unsupportedFormat: "The uploaded file format is not supported.",
    fileTooLarge: "The file is too large for the current upload limit.",
    failed: "Upload failed. Please retry or contact support if the problem continues.",
    complete: "Your upload has been queued for processing.",
  },
  form: {
    saved: "Your changes have been saved successfully.",
    requiredField: "A required field is missing. Please review the highlighted inputs.",
    genericError: "Something went wrong on our side. Please try again.",
  },
  empty: {
    courses: "No courses match your current filters.",
    analytics: "Not enough activity yet to generate reliable analytics.",
    announcements: "No announcements have been published yet.",
    uploads: "No upload jobs have been created yet.",
  },
} as const;

export function getSuspensionMessage(reason?: string | null) {
  if (!reason) {
    return messages.auth.suspended;
  }

  return `${messages.auth.suspended} Reason: ${reason}`;
}
