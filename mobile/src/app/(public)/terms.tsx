import { PublicScreen } from "@/components";
import { LegalSections } from "./_sections";
import type { Section } from "./_types";

const LAST_UPDATED = "2026-08-03";

const SECTIONS = [
  {
    kind: "terms",
    title: "Acceptable use",
    body: "You agree to use Takda in compliance with applicable laws and the documented API limits. You will not probe, scan, or test the platform's security without prior written permission.",
  },
  {
    kind: "terms",
    title: "Account termination",
    body: "We may suspend or terminate your account if you breach these terms, if your tenant is inactive for more than 12 months, or if we are required to do so by law.",
  },
  {
    kind: "terms",
    title: "Liability",
    body: "Takda is provided as-is. To the maximum extent permitted by law, we disclaim all warranties and are not liable for any indirect or consequential losses arising from your use of the service.",
  },
  {
    kind: "terms",
    title: "Governing law",
    body: "These terms are governed by the laws of the jurisdiction in which your tenant is registered. Disputes will be resolved in the courts of that jurisdiction.",
  },
  {
    kind: "terms",
    title: "Contact",
    body: "Questions about these terms can be sent to legal@takda.app.",
  },
  {
    kind: "terms",
    title: "Changes",
    body: "We may update these terms from time to time. We will post the revised version here and update the date below. Continued use of Takda after a change means you accept the revised terms.",
  },
] satisfies Section[];

export default function Terms() {
  return (
    <PublicScreen
      eyebrow="Terms"
      title="Terms of service"
      subtitle={`Last updated · ${LAST_UPDATED}`}
      showBackButton
    >
      <LegalSections
        sections={SECTIONS}
        questionsTitle="Questions about terms?"
        questionsBody="Reach the legal team at"
        questionsEmail="support.takda@gmail.com"
      />
    </PublicScreen>
  );
}
