const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

function getAppName() {
  if (IS_DEV) return "Takda (Dev)";
  if (IS_PREVIEW) return "Takda (Preview)";
  return "Takda";
}

function getPackageName() {
  if (IS_DEV) return "com.giomjds.takda.dev";
  if (IS_PREVIEW) return "com.giomjds.takda.preview";
  return "com.giomjds.takda";
}

function getBundleId() {
  if (IS_DEV) return "com.giomjds.takda.dev";
  if (IS_PREVIEW) return "com.giomjds.takda.preview";
  return "com.giomjds.takda";
}

function getScheme() {
  if (IS_DEV) return "takda-dev";
  if (IS_PREVIEW) return "takda-preview";
  return "takda";
}

module.exports = ({ config }) => {
  return {
    ...config,

    name: getAppName(),
    scheme: getScheme(),

    ios: {
      ...config.ios,
      bundleIdentifier: getBundleId(),
    },

    android: {
      ...config.android,
      package: getPackageName(),
    },

    updates: {
      ...config.updates,
      url: "https://u.expo.dev/cc98dd73-9b2a-47dc-81e3-a3394709890b",
    },

    runtimeVersion: {
      policy: "appVersion",
    },

    extra: {
      ...config.extra,
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
      appVariant: process.env.APP_VARIANT ?? "production",
    },
  };
};
