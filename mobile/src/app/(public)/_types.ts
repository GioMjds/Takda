export type SectionKind = "about" | "terms" | "privacy";

export type Section = {
  kind: SectionKind;
  title: string;
  body: string;
};
