import type { ComponentType } from "react";

/**
 * Shape flowing through the extraction pipeline
 * (upload → processing → extraction → validation). Filled by the
 * backend worker response; persisted to Supabase by the processing page.
 */
export type CaseRecord = {
  recId: string;
  owner: string;
  survey: string;
  khata: string;
  village: string;
  tehsil: string;
  district: string;
  area: number;
  areaDb: number;
  classification: string;
  mutationDate: string;
  dupSim: number;
  dupMatch: string | null;
  lang: string;
  docLabel: string;
};

export type UploadedFile = {
  name: string;
  sizeLabel: string;
  url: string | null;
  isImage: boolean;
};

export type WFStage = { icon: ComponentType<{ className?: string }>; label: string };

/** GIS parcel as rendered on the map (mirrors the `parcels` table). */
export type Parcel = {
  id?: string;
  lat: number;
  lng: number;
  survey: string;
  owner: string;
  area: string;
  status: "Verified" | "Pending" | "Conflict";
  village?: string | null;
};

export type VerificationRow = {
  id: string;
  priority: "High" | "Medium" | "Low";
  surveyNo: string;
  issue: string;
  category: string; // for filtering
  conf: string;
  ai: string;
  officer: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

export type AuditEvent = {
  time: string;
  title: string;
  desc: string;
  badge: "ok" | "warn";
  meta: string[];
};

export type OcrResult = {
  text: string;
  confidence: number;
  lang: string;
};
