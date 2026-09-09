import type { WFStage } from "@/lib/types";

export const WF_STAGES: WFStage[] = [
  { ic: "📄", label: "Old Document" },
  { ic: "⭱", label: "Upload" },
  { ic: "🔤", label: "OCR Processing" },
  { ic: "🧠", label: "AI Extraction" },
  { ic: "✓", label: "Validation" },
  { ic: "👤", label: "Human Verification" },
  { ic: "🗂", label: "Verified Digital Record" },
];

export const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  upload: "Upload record",
  processing: "AI processing",
  extraction: "Extracted record",
  validation: "Validation center",
  verification: "Verification queue",
  record: "Digital records",
  gis: "GIS / land map",
  analytics: "Analytics",
  audit: "Audit trail",
};

export const wfStageMap: Record<string, { idx: number }> = {
  upload: { idx: 1 },
  processing: { idx: 2 },
  extraction: { idx: 3 },
  validation: { idx: 4 },
  verification: { idx: 5 },
  record: { idx: 6 },
  gis: { idx: 6 },
  audit: { idx: 6 },
  dashboard: { idx: 0 },
};
