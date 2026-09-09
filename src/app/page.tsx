import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Sarvam-style hero mesh: saffron → mauve → periwinkle */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-12 py-5 bg-[rgba(252,252,252,0.85)] backdrop-blur-md border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight text-[var(--ink-800)]">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)]" /> LANDLENS
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-[var(--gray-600)]">
          <a href="#integration" className="hover:text-[var(--ink-800)]">Integration</a>
          <a href="#security" className="hover:text-[var(--ink-800)]">Security</a>
        </div>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">Officer login</Link>
      </nav>

      {/* Hero with Sarvam grain + mesh */}
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
            <Link href="/upload" className="btn btn-teal">Start digitizing</Link>
            <a href="#integration" className="btn btn-ghost">Learn more</a>
          </div>
        </div>
      </section>

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

      <div className="max-w-[1160px] mx-auto px-12 pb-24">
        <div className="rounded-3xl px-12 py-14 text-center text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, var(--ink-800) 0%, #3C415B 60%, #657099 100%)` }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(600px 300px at 30% 0%, var(--saffron-600), transparent)` }} />
          <h2 className="relative font-[var(--font-serif)] text-3xl mb-2">See the full digitization workflow in action.</h2>
          <p className="relative text-[#DCE5FE] mb-6">From a scanned 1962 register to a verified digital record, in one guided walkthrough.</p>
          <Link href="/upload" className="relative btn bg-white text-[var(--ink-800)] hover:bg-[var(--surface-raised)]">Start digitizing</Link>
        </div>
      </div>

      <footer className="border-t border-[var(--border-hairline)] py-8 text-center text-xs text-[var(--gray-600)]">
        LANDLENS — SIH 2026 prototype. All records shown are illustrative demo data.
      </footer>
    </div>
  );
}
