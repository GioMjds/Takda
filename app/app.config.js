const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

function getAppName() {
  if (IS_DEV) return "SariSari (Dev)";
  if (IS_PREVIEW) return "SariSari (Preview)";
  return "SariSari";
}

function getPackageName() {
  if (IS_DEV) return "com.giomjds.sarisari.dev";
  if (IS_PREVIEW) return "com.giomjds.sarisari.preview";
  return "com.giomjds.sarisari";
}

function getBundleId() {
  if (IS_DEV) return "com.giomjds.sarisari.dev";
  if (IS_PREVIEW) return "com.giomjds.sarisari.preview";
  return "com.giomjds.sarisari";
}

function getScheme() {
  if (IS_DEV) return "sarisari-dev";
  if (IS_PREVIEW) return "sarisari-preview";
  return "sarisari";
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

    extra: {
      ...config.extra,
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
      appVariant: process.env.APP_VARIANT ?? "production",
    },
  };
};
