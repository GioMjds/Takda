import { PublicScreen } from "@/components";
import { LegalSections } from "./_sections";
import type { Section } from "./_types";

const LAST_UPDATED = "2026-08-03";

const SECTIONS = [
  {
    kind: "privacy",
    title: "What we collect",
    body: "When you create an account, we collect your first name, last name, email, and the role assigned to you by your tenant.",
  },
  {
    kind: "privacy",
    title: "Auth tokens",
    body: "We store two auth tokens on your device. The access token is short-lived and lets the app call the API. The refresh token is used to obtain a new access token when the current one expires. Both are stored in the device's secure keychain.",
  },
  {
    kind: "privacy",
    title: "Local cache",
    body: "We cache your profile in non-encrypted device storage so the app can render the home screen without a network round-trip on launch.",
  },
  {
    kind: "privacy",
    title: "Sharing",
    body: "We do not sell your data. We share data only with service providers that help us run the platform, or where required by law.",
  },
  {
    kind: "privacy",
    title: "Your rights",
    body: "You can request a copy of your data, ask us to correct it, or close your account by emailing privacy@takda.app.",
  },
  {
    kind: "privacy",
    title: "Changes",
    body: "We may update this policy from time to time. We will post the revised version here and update the date below.",
  },
] satisfies Section[];

export default function Privacy() {
  return (
    <PublicScreen
      eyebrow="Privacy"
      title="Privacy policy"
      subtitle={`Last updated · ${LAST_UPDATED}`}
      showBackButton
    >
      <LegalSections
        sections={SECTIONS}
        questionsTitle="Questions about your data?"
        questionsBody="Reach the privacy team at"
        questionsEmail="support.takda@gmail.com"
      />
    </PublicScreen>
  );
}
