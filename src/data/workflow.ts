import { FileText, Upload, Languages, BrainCircuit, FileCheck2, UserCheck, Database } from "lucide-react";

export const WF_STAGES = [
  { icon: FileText, label: "Old Document" },
  { icon: Upload, label: "Upload" },
  { icon: Languages, label: "OCR Processing" },
  { icon: BrainCircuit, label: "AI Extraction" },
  { icon: FileCheck2, label: "Validation" },
  { icon: UserCheck, label: "Human Verification" },
  { icon: Database, label: "Verified Digital Record" },
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
