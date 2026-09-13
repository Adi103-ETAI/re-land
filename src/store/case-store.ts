"use client";
import { create } from "zustand";
import type { CaseRecord, UploadedFile } from "@/lib/types";

type BBox =
  | { ymin: number; xmin: number; ymax: number; xmax: number }
  | { x: number; y: number; w: number; h: number }
  | null;
export type Field = { key: string; value: string; confidence: number; bbox?: BBox; source?: string };

type CaseStore = {
  /** The record currently flowing through the pipeline (null = nothing yet). */
  currentCase: CaseRecord | null;
  /** Supabase row id of the record backing currentCase (set after saving). */
  recordId: string | null;
  uploadedFile: UploadedFile | null;
  jobId: string | null;
  fields: Field[] | null;
  documentId: string | null;
  ocrText: string;
  ocrConfidence: number;
  setCase: (c: CaseRecord) => void;
  setRecordId: (id: string | null) => void;
  setDocumentId: (id: string | null) => void;
  setUploadedFile: (f: UploadedFile | null) => void;
  setJobId: (id: string | null) => void;
  setFields: (fields: Field[] | null) => void;
  setOcrResult: (text: string, conf: number) => void;
  reset: () => void;
};

export const useCaseStore = create<CaseStore>((set) => ({
  currentCase: null,
  recordId: null,
  uploadedFile: null,
  jobId: null,
  fields: null,
  documentId: null,
  ocrText: "",
  ocrConfidence: 0,
  setCase: (currentCase) => set({ currentCase }),
  setRecordId: (recordId) => set({ recordId }),
  setDocumentId: (documentId) => set({ documentId }),
  setUploadedFile: (uploadedFile) => set({ uploadedFile }),
  setJobId: (jobId) => set({ jobId }),
  setFields: (fields) => set({ fields }),
  setOcrResult: (ocrText, ocrConfidence) => set({ ocrText, ocrConfidence }),
  reset: () =>
    set({
      currentCase: null,
      recordId: null,
      documentId: null,
      uploadedFile: null,
      jobId: null,
      fields: null,
      ocrText: "",
      ocrConfidence: 0,
    }),
}));
