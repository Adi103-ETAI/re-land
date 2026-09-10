"use client";
import { create } from "zustand";
import type { CaseRecord, UploadedFile } from "@/lib/types";
import { caseRecords } from "@/data/cases";

type BBox = { ymin: number; xmin: number; ymax: number; xmax: number } | { x: number; y: number; w: number; h: number } | null;
type Field = { key: string; value: string; confidence: number; bbox?: BBox; source?: string };

type CaseStore = {
  currentCase: CaseRecord;
  uploadedFile: UploadedFile | null;
  pickedSample: number;
  jobId: string | null;
  fields: Field[] | null;
  setCase: (c: CaseRecord) => void;
  setUploadedFile: (f: UploadedFile | null) => void;
  setPickedSample: (i: number) => void;
  setJobId: (id: string | null) => void;
  setFields: (fields: Field[] | null) => void;
  ocrText: string;
  ocrConfidence: number;
  setOcrResult: (text: string, conf: number) => void;
};

export const useCaseStore = create<CaseStore>((set) => ({
  currentCase: caseRecords[0],
  uploadedFile: null,
  pickedSample: 0,
  jobId: null,
  fields: null,
  ocrText: "",
  ocrConfidence: 0,
  setCase: (currentCase) => set({ currentCase }),
  setUploadedFile: (uploadedFile) => set({ uploadedFile }),
  setPickedSample: (pickedSample) => set({ pickedSample }),
  setJobId: (jobId) => set({ jobId }),
  setFields: (fields) => set({ fields }),
  setOcrResult: (ocrText, ocrConfidence) => set({ ocrText, ocrConfidence }),
}));
