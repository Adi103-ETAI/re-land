"use client";
import { create } from "zustand";
import type { CaseRecord, UploadedFile } from "@/lib/types";
import { caseRecords } from "@/data/cases";

type CaseStore = {
  currentCase: CaseRecord;
  uploadedFile: UploadedFile | null;
  pickedSample: number;
  setCase: (c: CaseRecord) => void;
  setUploadedFile: (f: UploadedFile | null) => void;
  setPickedSample: (i: number) => void;
  ocrText: string;
  ocrConfidence: number;
  setOcrResult: (text: string, conf: number) => void;
};

export const useCaseStore = create<CaseStore>((set) => ({
  currentCase: caseRecords[0],
  uploadedFile: null,
  pickedSample: 0,
  ocrText: "",
  ocrConfidence: 0,
  setCase: (currentCase) => set({ currentCase }),
  setUploadedFile: (uploadedFile) => set({ uploadedFile }),
  setPickedSample: (pickedSample) => set({ pickedSample }),
  setOcrResult: (ocrText, ocrConfidence) => set({ ocrText, ocrConfidence }),
}));
