import type { ComponentType } from "react";

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

export type Parcel = {
  lat: number;
  lng: number;
  survey: string;
  owner: string;
  area: string;
  status: "Verified" | "Pending" | "Conflict";
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
