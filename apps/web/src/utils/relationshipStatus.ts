export interface RelationshipOption {
  value: string;
  labelVi: string;
  labelEn: string;
}

export const RELATIONSHIP_STATUS_OPTIONS: readonly RelationshipOption[] = [
  { value: "single", labelVi: "Độc thân", labelEn: "Single" },
  { value: "dating", labelVi: "Đang hẹn hò", labelEn: "In a relationship / Dating" },
  { value: "engaged", labelVi: "Đã đính hôn", labelEn: "Engaged" },
  { value: "married", labelVi: "Đã kết hôn", labelEn: "Married" },
  { value: "complicated", labelVi: "Có mối quan hệ phức tạp", labelEn: "It's complicated" },
  { value: "separated", labelVi: "Đã ly thân", labelEn: "Separated" },
  { value: "divorced", labelVi: "Đã ly hôn", labelEn: "Divorced" },
  { value: "widowed", labelVi: "Góa", labelEn: "Widowed" },
] as const;

export function getRelationshipLabel(
  status: string | undefined | null,
  lang: "vi" | "en" = "vi",
): string | null {
  if (!status) return null;
  const match = RELATIONSHIP_STATUS_OPTIONS.find((item) => item.value === status);
  if (!match) return status;
  return lang === "en" ? match.labelEn : match.labelVi;
}

