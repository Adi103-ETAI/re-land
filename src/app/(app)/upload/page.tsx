"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload PDF, JPEG, PNG, or TIFF.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", session.user.id);

      // Simulate upload progress
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Call upload API (replace with actual endpoint once backend is ready)
      const response = await fetch("/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      setUploadSuccess(true);
      
      // Redirect to processing or records page
      setTimeout(() => {
        window.location.href = `/processing/${result.job_id}`;
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border-hairline)] px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-lg text-[var(--ink-800)]">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" />
            LANDLENS
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Dashboard</Link>
            <Link href="/upload" className="font-medium text-[var(--ink-800)]">Upload</Link>
            <Link href="/records" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Records</Link>
            <Link href="/verification" className="text-[var(--gray-600)] hover:text-[var(--ink-800)]">Verification</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-[var(--font-serif)] text-[var(--ink-900)] mb-2">Upload Document</h1>
          <p className="text-[var(--gray-600)]">Upload land records for digitization and extraction</p>
        </div>

        {/* Upload Area */}
        <div className="card !p-8 mb-8">
          <div className="border-2 border-dashed border-[var(--border-hairline)] rounded-xl p-12 text-center hover:border-[var(--teal-500)] transition-colors">
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-lg font-medium text-[var(--ink-800)] mb-2">
                {file ? file.name : "Drag & drop your file here"}
              </p>
              <p className="text-sm text-[var(--gray-600)]">
                Supports PDF, JPEG, PNG, TIFF (Max 50MB)
              </p>
            </label>
          </div>

          {file && (
            <div className="mt-4 p-4 bg-[var(--peri-100)] rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{file.type.includes("pdf") ? "📄" : "🖼️"}</span>
                  <div>
                    <p className="font-medium text-[var(--ink-800)]">{file.name}</p>
                    <p className="text-sm text-[var(--gray-600)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-[var(--gray-500)] hover:text-[var(--ink-800)]"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="btn btn-teal w-full mt-6"
          >
            {uploading ? `Uploading... ${progress}%` : "Start Extraction"}
          </button>
        </div>

        {/* Supported Formats */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: "📄", title: "PDF Documents", desc: "Revenue records, surveys, maps" },
            { icon: "🗞️", title: "Handwritten Registers", desc: "Historical records, field notes" },
            { icon: "🗺️", title: "Maps & Plans", desc: "Cadastral maps, survey plans" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="card !p-5 text-center">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-[var(--ink-900)] mb-1">{title}</h3>
              <p className="text-sm text-[var(--gray-600)]">{desc}</p>
            </div>
          ))}
        </div>

        {/* Process Info */}
        <div className="mt-8 card !p-6">
          <h2 className="font-semibold text-[var(--ink-900)] mb-4">What happens next?</h2>
          <div className="space-y-3">
            {[
              { step: 1, title: "Document Classification", desc: "AI identifies document type and language" },
              { step: 2, title: "OCR Extraction", desc: "Text extraction using tesseract + VLM" },
              { step: 3, title: "Field Recognition", desc: "Khasra number, owner name, area detected" },
              { step: 4, title: "Validation", desc: "Business rules applied, risk scoring" },
              { step: 5, title: "Review Queue", desc: "Ready for officer verification" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--teal-600)] text-white flex items-center justify-center font-bold flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-[var(--ink-800)]">{title}</p>
                  <p className="text-sm text-[var(--gray-600)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}