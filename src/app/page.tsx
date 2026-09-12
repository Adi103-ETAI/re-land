import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-12 py-5 bg-[rgba(252,252,252,0.85)] backdrop-blur-md border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight text-[var(--ink-800)]">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" /> LANDLENS
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-[var(--gray-600)]">
          <a href="#features" className="hover:text-[var(--ink-800)]">Features</a>
          <a href="#integration" className="hover:text-[var(--ink-800)]">Integration</a>
          <a href="#security" className="hover:text-[var(--ink-800)]">Security</a>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-ghost btn-sm">Officer Login</Link>
          <Link href="/signup" className="btn btn-teal btn-sm">Register</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `radial-gradient(800px 400px at 50% 0%, var(--saffron-300) 0%, transparent 60%), linear-gradient(180deg, #FFF7ED 0%, #FDF2E8 20%, var(--peri-100) 55%, var(--surface-page) 100%)`
        }} />
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
        <div className="relative max-w-[1160px] mx-auto px-12 pt-24 pb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-[var(--border-hairline)] px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide text-[var(--indigo-600)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--saffron-600)] animate-pulse" /> SIH 2026 PROTOTYPE · LAND RECORD MODERNIZATION
          </div>
          <h1 className="font-[var(--font-serif)] text-[clamp(32px,5vw,56px)] leading-[1.05] tracking-tight text-[var(--ink-900)] max-w-[920px] mx-auto font-normal">
            Transforming historical land records into trusted <span className="relative inline-block">digital intelligence.<span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-[var(--saffron-600)] to-[var(--peri-300)] opacity-40 rounded-full" /></span>
          </h1>
          <p className="text-lg text-[var(--gray-600)] max-w-[620px] mx-auto mt-6 leading-relaxed">
            AI-powered digitization, validation and verification of India&apos;s legacy land records — from a faded 1962 register to a verified digital record, with a human in the loop wherever it matters.
          </p>
          <div className="flex gap-3.5 justify-center mt-8 flex-wrap">
            <Link href="/signup" className="btn btn-teal">Create Account</Link>
            <Link href="/login" className="btn btn-ghost">Officer Login</Link>
            <a href="#features" className="btn btn-ghost">Learn more</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-[1160px] mx-auto px-12 py-24">
        <div className="text-center mb-12">
          <h2 className="font-[var(--font-serif)] text-3xl text-[var(--ink-900)] mb-3">Intelligent Land Record Platform</h2>
          <p className="text-[var(--gray-600)] max-w-[600px] mx-auto">End-to-end digitization, validation and verification with full audit trail</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {icon: "📄", title: "Document Ingestion", desc: "Bulk upload with auto-classification by document type, language and format"},
            {icon: "🤖", title: "AI Extraction", desc: "OCR + VLM pipeline for printed and handwritten text across multiple Indian languages"},
            {icon: "✓", title: "Validation Engine", desc: "Business rules, duplicate detection, GIS/cadastral checks with risk scoring"},
            {icon: "👤", title: "Human Verification", desc: "Exception-driven review workflow for low-confidence or conflicting records"},
            {icon: "🗺️", title: "GIS Integration", desc: "Parcel visualization and spatial validation against cadastral maps"},
            {icon: "📊", title: "Analytics & Audit", desc: "Real-time dashboards and immutable audit trail for every action"},
          ].map(({icon, title, desc}) => (
            <div key={title} className="card p-6">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-[var(--ink-900)] mb-2">{title}</h3>
              <p className="text-sm text-[var(--gray-600)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integration */}
      <section id="integration" className="max-w-[1160px] mx-auto px-12 py-24">
        <div className="max-w-[640px] mb-12">
          <div className="eyebrow mb-3 text-[var(--saffron-600)]">Integration</div>
          <h2 className="font-[var(--font-serif)] text-4xl leading-tight tracking-tight text-[var(--ink-900)] mb-3">Built to sit inside government systems, not replace them.</h2>
          <p className="text-[var(--gray-600)] leading-relaxed">A secure API layer connects LANDLENS to the systems land departments already run.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["LRMS", "Land Records Management"],
            ["DILRMP", "National digitization mission"],
            ["GIS", "Cadastral map platforms"],
            ["Registration", "State registration systems"],
          ].map(([k, v]) => (
            <div key={k} className="card !p-5">
              <div className="font-mono font-bold text-lg text-[var(--ink-800)]">{k}</div>
              <div className="text-xs text-[var(--gray-600)] mt-1">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="max-w-[1160px] mx-auto px-12 pb-24">
        <div className="max-w-[640px] mb-12">
          <div className="eyebrow mb-3 text-[var(--saffron-600)]">Security & Access</div>
          <h2 className="font-[var(--font-serif)] text-4xl tracking-tight text-[var(--ink-900)] mb-3">Every action is attributable.</h2>
          <p className="text-[var(--gray-600)] leading-relaxed">Role-based access, encrypted storage and a full audit trail on every field that changes.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["◆", "Role-based access", "Administrator, officer, verifier, auditor and citizen each see only what their role permits."],
            ["⌗", "Audit logging", "Every extraction, correction and approval is timestamped and attributed."],
            ["⛭", "Secure API", "Authenticated REST access for integrating government systems."],
          ].map(([ic, t, d]) => (
            <div key={t} className="card">
              <div className="w-9 h-9 rounded-xl bg-[#FFF3EA] text-[var(--saffron-600)] flex items-center justify-center font-bold mb-3.5">{ic}</div>
              <h3 className="font-semibold text-[var(--ink-900)] mb-1.5">{t}</h3>
              <p className="text-sm text-[var(--gray-600)] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="max-w-[1160px] mx-auto px-12 pb-24">
        <div className="rounded-3xl px-12 py-14 text-center text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, var(--ink-800) 0%, #3C415B 60%, #657099 100%)` }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(600px 300px at 30% 0%, var(--saffron-600), transparent)` }} />
          <h2 className="relative font-[var(--font-serif)] text-3xl mb-2">See the full digitization workflow in action.</h2>
          <p className="relative text-[#DCE5FE] mb-6">From a scanned 1962 register to a verified digital record, in one guided walkthrough.</p>
          <div className="relative flex gap-3 justify-center">
            <Link href="/signup" className="btn bg-white text-[var(--ink-800)] hover:bg-[var(--surface-raised)]">Create Account</Link>
            <Link href="/login" className="btn bg-white/20 text-white hover:bg-white/30">Officer Login</Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-[var(--border-hairline)] py-8 text-center text-xs text-[var(--gray-600)]">
        LANDLENS — SIH 2026 prototype. All records shown are illustrative demo data.
      </footer>
    </div>
  );
}
