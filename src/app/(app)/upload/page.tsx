"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, FileText, Images, Map as MapIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCaseStore } from "@/store/case-store";

const STEPS = [
  { title: "Document classification", desc: "AI identifies document type and language" },
  { title: "OCR extraction", desc: "Text extraction using VLM + Tesseract fallback" },
  { title: "Field recognition", desc: "Khasra number, owner name, area detected" },
  { title: "Validation", desc: "Business rules applied, risk scoring" },
  { title: "Review queue", desc: "Ready for officer verification" },
];

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];

export default function UploadPage() {
  const router = useRouter();
  const { setUploadedFile, setJobId } = useCaseStore();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setError("Invalid file type. Please upload PDF, JPEG, PNG, or TIFF.");
      return;
    }
    setError("");
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }
    setUploading(true);
    setError("");

    // Hold the file in the workflow store so processing/extraction can show it
    setUploadedFile({
      name: file.name,
      sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      isImage: file.type.startsWith("image/"),
    });

    // Fire the backend request without blocking navigation — if the FastAPI
    // service is reachable we pick up its job id; otherwise processing falls
    // back to the simulated pipeline automatically.
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/upload", { method: "POST", body: formData, signal: AbortSignal.timeout(4000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        const id = result?.jobId ?? result?.job_id;
        if (id) {
          setJobId(id);
          try {
            sessionStorage.setItem("landlens_jobId", id);
          } catch {
            /* private mode — store stays in memory */
          }
        }
      })
      .catch(() => setJobId(null));
    router.push("/processing");
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Upload document"
        description="Upload land records for digitization and extraction."
      />

      <Card className="mb-6 border-border/80">
        <CardContent className="p-6 md:p-8">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              dragging
                ? "border-primary bg-accent/60"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <CloudUpload className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold">
              {dragging ? "Drop it here" : file ? file.name : "Drag & drop your file here"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Supports PDF, JPEG, PNG, TIFF · Max 50MB
            </p>
            <Button type="button" variant="outline" className="mt-5 rounded-full" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              Browse files
            </Button>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected file preview" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <FileText className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="mt-6 h-12 w-full rounded-2xl text-[15px] shadow-md shadow-primary/20"
          >
            {uploading ? "Uploading…" : "Start extraction"}
          </Button>
        </CardContent>
      </Card>

      {/* Supported formats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: FileText, title: "PDF documents", desc: "Revenue records, surveys" },
          { icon: Images, title: "Handwritten registers", desc: "Historical records, field notes" },
          { icon: MapIcon, title: "Maps & plans", desc: "Cadastral maps, survey plans" },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-border/80">
            <CardContent className="flex items-start gap-3.5 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* What happens next */}
      <Card className="border-border/80">
        <CardContent className="p-6">
          <h2 className="mb-5 font-semibold">What happens next?</h2>
          <div className="space-y-0">
            {STEPS.map(({ title, desc }, i) => (
              <div key={title} className="relative flex gap-4 pb-5 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span className="absolute left-[15px] top-9 h-[calc(100%-24px)] w-px bg-border" />
                )}
                <span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
