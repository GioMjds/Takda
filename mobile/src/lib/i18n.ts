import AsyncStorage from "@react-native-async-storage/async-storage";
import { initReactI18next } from "react-i18next";
import i18n from "i18next";

const LANGUAGE_KEY = "takda_language_preference";

export type SupportedLanguage = "en" | "tl";

const resources = {
  en: {},
  tl: {},
} satisfies Record<SupportedLanguage, Record<string, unknown>>;

export const initI18n = async (): Promise<void> => {
  let savedLanguage: string | null = null;
  try {
    savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.warn("Could not read saved language preference:", error);
  }

  const initialLanguage: SupportedLanguage =
    savedLanguage === "tl" ? "tl" : "en";

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
};

export const changeAppLanguage = async (
  lang: SupportedLanguage,
): Promise<void> => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): SupportedLanguage =>
  (i18n.language as SupportedLanguage) === "tl" ? "tl" : "en";

export default i18n;
