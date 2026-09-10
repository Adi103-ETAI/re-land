"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Tracker from "@/components/workflow/Tracker";
import { useCaseStore } from "@/store/case-store";
import { caseRecords } from "@/data/cases";
import { runOcr, ocrToCase, generateFromFileMeta } from "@/lib/ocr";

export default function UploadPage() {
  const router = useRouter();
  const { setCase, uploadedFile, setUploadedFile, pickedSample, setPickedSample, setOcrResult, setJobId, setFields } = useCaseStore();
  const [lang, setLang] = useState("Marathi");
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const isImage = /^image\//.test(file.type) || /\.(jpg|jpeg|png|tif|tiff)$/i.test(file.name);
    const url = isImage ? URL.createObjectURL(file) : null;
    const sizeLabel = file.size > 1024 * 1024 ? (file.size / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(file.size / 1024)) + " KB";
    setUploadedFile({ name: file.name, sizeLabel: `${sizeLabel} · ${file.type || "unknown"}`, url, isImage });
  };

  const clear = () => {
    if (uploadedFile?.url) URL.revokeObjectURL(uploadedFile.url);
    setUploadedFile(null);
    if (inputRef.current) inputRef.current.value = "";
    setPickedSample(0);
  };

  const pickSample = (i: number) => {
    if (uploadedFile?.url) URL.revokeObjectURL(uploadedFile.url);
    setUploadedFile(null);
    if (inputRef.current) inputRef.current.value = "";
    setPickedSample(i);
  };

  const start = async () => {
    setLoading(true);
    // Try backend first — careful extraction pipeline (see backend/PLAN.md)
    if (uploadedFile && inputRef.current?.files?.[0]) {
      try {
        const fd = new FormData();
        fd.append("file", inputRef.current.files[0]);
        fd.append("lang", lang);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const job = await res.json();
          setJobId(job.jobId);
          setFields(null);
          sessionStorage.setItem("landlens_jobId", job.jobId);
          router.push("/processing");
          return;
        }
      } catch {
        // backend not running — fall through to client OCR
      }
    }
    // Fallback: client-side Tesseract.js (demo mode, see src/lib/ocr.ts)
    if (uploadedFile) {
      try {
        const ext = uploadedFile.name.toLowerCase();
        const isImageFile = /\.(png|jpg|jpeg|tif|tiff)$/.test(ext);
        let ocrPatch = null;
        if (isImageFile && inputRef.current?.files?.[0]) {
          const file = inputRef.current.files[0];
          const res = await runOcr(file, lang);
          setOcrResult(res.text.slice(0, 2000), res.confidence);
          ocrPatch = ocrToCase(res);
        }
        const fileObj = inputRef.current?.files?.[0] ?? new File([], uploadedFile.name);
        Object.defineProperty(fileObj, "size", { value: 1024 * (10 + uploadedFile.name.length) });
        const c = generateFromFileMeta(fileObj as File, ocrPatch);
        setCase(c);
      } catch {
        const fileObj = new File([], uploadedFile.name);
        Object.defineProperty(fileObj, "size", { value: 1024 * (10 + uploadedFile.name.length) });
        setCase(generateFromFileMeta(fileObj as File, null));
      }
    } else {
      setCase(caseRecords[pickedSample]);
    }
    router.push("/processing");
  };

  return (
    <div>
      <div className="mb-5"><h2 className="font-[var(--font-serif)] text-2xl font-semibold">Upload & digitize</h2><p className="text-sm text-[var(--gray-600)]">Upload a scanned land record. Backend pipeline (FastAPI → preprocess → OCR ensemble → fusion) extracts fields carefully; client OCR is demo fallback.</p></div>
      <Tracker activeIdx={1} />
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <div>
          <div
            onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => { if (!uploadedFile) inputRef.current?.click(); }}
            className={`border-2 border-dashed rounded-2xl bg-white p-12 text-center cursor-pointer transition ${drag ? "border-[var(--saffron-600)] bg-[#FFF7ED]" : "border-[#E8D9C6]"}`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff" hidden onChange={(e) => handleFiles(e.target.files)} />
            {!uploadedFile ? (
              <>
                <div className="text-4xl mb-3">📄</div>
                <h3 className="font-semibold text-[var(--ink-800)]">Upload historical land record</h3>
                <p className="text-sm text-[var(--gray-600)] mt-1 mb-4">Drag and drop a file here, or browse — or choose a sample below.</p>
                <div className="flex gap-2 justify-center mb-4">{["PDF", "JPG", "PNG", "TIFF"].map(c => <span key={c} className="bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-2.5 py-1 rounded-lg text-[11px] font-mono text-[var(--gray-600)]">{c}</span>)}</div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Browse files</button>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-xl mx-auto mb-3 border border-[var(--border-hairline)] bg-cover bg-center flex items-center justify-center text-3xl overflow-hidden" style={uploadedFile.isImage && uploadedFile.url ? { backgroundImage: `url(${uploadedFile.url})` } : {}}>
                  {!uploadedFile.isImage && "📄"}
                </div>
                <h3 className="font-semibold text-[var(--ink-800)]">{uploadedFile.name}</h3>
                <p className="text-xs text-[var(--gray-600)] mb-3">{uploadedFile.sizeLabel} — ready to digitize</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); clear(); }}>Remove file</button>
              </>
            )}
          </div>
          <div className="card mt-4">
            <h3 className="text-sm font-semibold mb-3">Or select a sample record</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {caseRecords.map((c, i) => (
                <button key={c.recId} onClick={() => pickSample(i)} className={`text-left border rounded-xl p-3.5 transition ${pickedSample === i && !uploadedFile ? "border-[var(--saffron-600)] bg-[#FFF7ED]" : "border-[var(--border-hairline)] hover:border-[var(--saffron-600)]"}`}>
                  <div className="h-16 rounded-lg mb-2 border border-[#DCD2AE] bg-[repeating-linear-gradient(0deg,#EFEAD9,#EFEAD9_3px,#E6DFC8_3px,#E6DFC8_4px)]" />
                  <div className="text-xs font-bold text-[var(--ink-800)]">{c.docLabel.split(",")[0]}</div>
                  <div className="text-[11px] text-[var(--gray-600)]">{c.village}, Pune · {c.lang}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <h3 className="text-sm font-semibold mb-2">Document language</h3>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full px-3 py-2.5 border border-[var(--border-hairline)] rounded-xl text-sm bg-white">
              <option>Auto detect</option><option>Hindi</option><option>Marathi</option><option>English</option><option>Gujarati</option><option>Kannada</option><option>Tamil</option>
            </select>
          </div>
          <div className="card mt-4">
            <h3 className="text-sm font-semibold mb-3">AI processing options</h3>
            <div className="grid grid-cols-1 gap-1.5 text-sm">
              {["Detect document type","Enhance image quality","Detect handwriting","Extract landowner details","Extract survey number","Extract khasra number","Extract khata number","Extract area","Extract village / tehsil / district","Detect land classification","Extract mutation information","Validate extracted information","Detect duplicate records"].map(l => (
                <label key={l} className="flex items-center gap-2.5 py-1 text-[var(--ink-900)]"><input type="checkbox" defaultChecked className="accent-[var(--saffron-600)] w-4 h-4" /> {l}</label>
              ))}
            </div>
          </div>
          <button onClick={start} disabled={loading} className="btn btn-teal w-full mt-4 h-12 text-sm">{loading ? "Uploading…" : "Start AI digitization"}</button>
          <p className="text-[11px] text-[var(--gray-600)] mt-2 text-center">Backend: FastAPI + OpenCV + Paddle/TrOCR + fusion (see <code>backend/PLAN.md</code>). Falls back to browser Tesseract.js if backend offline.</p>
        </div>
      </div>
    </div>
  );
}
