"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Fingerprint,
  Landmark,
  Lock,
  MapPinned,
  ScanLine,
  ShieldCheck,
  UserCheck,
  Languages,
  Database,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSession, signOut } from "@/lib/supabase";

const features = [
  {
    icon: FileText,
    title: "Document Ingestion",
    desc: "Bulk upload with automatic classification by document type, language and format — registers, mutations, field notes.",
  },
  {
    icon: BrainCircuit,
    title: "AI Extraction",
    desc: "OCR + VLM pipeline reads printed and handwritten text across multiple Indian languages, with per-field bounding boxes.",
  },
  {
    icon: ScanLine,
    title: "Validation Engine",
    desc: "Business rules, duplicate detection and GIS/cadastral cross-checks produce a transparent risk score per record.",
  },
  {
    icon: UserCheck,
    title: "Human Verification",
    desc: "Exception-driven review queue — officers only touch records the AI is not confident about.",
  },
  {
    icon: MapPinned,
    title: "GIS Integration",
    desc: "Parcel visualization on cadastral maps with historical vs. current boundary comparison.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Audit",
    desc: "Real-time dashboards and an immutable, attributable audit trail for every field that ever changes.",
  },
];

const stages = [
  { label: "Old document", icon: FileText },
  { label: "Upload", icon: FileText },
  { label: "OCR processing", icon: Languages },
  { label: "AI extraction", icon: BrainCircuit },
  { label: "Validation", icon: FileCheck2 },
  { label: "Human verification", icon: UserCheck },
  { label: "Digital record", icon: Database },
];

export default function Landing() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSession().then((session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Landmark className="h-4.5 w-4.5" />
            </span>
            LANDLENS
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#workflow" className="transition-colors hover:text-foreground">Workflow</a>
            <a href="#integration" className="transition-colors hover:text-foreground">Integration</a>
            <a href="#security" className="transition-colors hover:text-foreground">Security</a>
          </div>

          <div className="flex items-center gap-2.5">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
            ) : user ? (
              <>
                <Link href="/dashboard">
                  <Button size="sm" className="rounded-full">Dashboard <ArrowRight className="h-4 w-4" /></Button>
                </Link>
                <Button size="sm" variant="ghost" className="hidden rounded-full sm:inline-flex" onClick={handleLogout}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost" className="rounded-full">Officer login</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="rounded-full">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 420px at 50% -10%, rgba(248,118,19,0.14) 0%, transparent 65%), radial-gradient(700px 380px at 85% 20%, rgba(234,106,10,0.07) 0%, transparent 60%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24">
            <div>
              <Badge variant="outline" className="mb-6 gap-2 whitespace-normal rounded-full border-primary/30 bg-accent px-3.5 py-1.5 text-center text-xs font-semibold leading-relaxed text-accent-foreground">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                SIH 2026 PROTOTYPE
                <span className="hidden sm:inline">&nbsp;· LAND RECORD MODERNIZATION</span>
              </Badge>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                From faded registers to{" "}
                <span className="relative whitespace-nowrap text-primary">
                  trusted records
                  <svg className="absolute -bottom-1.5 left-0 w-full" height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
                    <path d="M2 6 Q 60 1 100 4 T 198 3" fill="none" stroke="rgba(234,106,10,0.45)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
                , digitized with a human in the loop.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                LANDLENS reads India&apos;s legacy land documents — printed or handwritten, in any language —
                validates them against live databases, and hands officers a verified digital record.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="h-12 rounded-full px-7 text-[15px] shadow-lg shadow-primary/25">
                      Open dashboard <ArrowRight className="h-4.5 w-4.5" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/signup">
                      <Button size="lg" className="h-12 rounded-full px-7 text-[15px] shadow-lg shadow-primary/25">
                        Create account <ArrowRight className="h-4.5 w-4.5" />
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button size="lg" variant="outline" className="h-12 rounded-full px-7 text-[15px]">
                        Officer login
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
                {["94% avg. extraction confidence", "7-language OCR", "100% attributable actions"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero visual — document scan → structured record */}
            <div className="relative hidden lg:block">
              <div className="animate-floaty relative mx-auto w-full max-w-[460px]">
                {/* Scanned document card */}
                <Card className="relative z-10 overflow-hidden border-border/80 shadow-xl shadow-black/5">
                  <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">REGISTER_42-3_WAGHOLI_1962.jpg</span>
                    <Badge className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold">SCANNING</Badge>
                  </div>
                  <div className="relative h-[190px] bg-[#efe9dc]">
                    <div className="space-y-2.5 p-5 opacity-60">
                      {[82, 55, 70, 38, 76, 48, 64, 30].map((w, i) => (
                        <div key={i} className="h-2 rounded-sm bg-[#c9bda0]" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                    <div className="animate-scan absolute left-0 right-0 h-[60px] bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
                  </div>
                </Card>

                {/* Extracted record card */}
                <Card className="absolute -bottom-12 -right-4 z-20 w-[290px] border-border/80 bg-card/95 shadow-2xl shadow-black/10 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wide text-muted-foreground">EXTRACTED RECORD</span>
                      <Badge className="rounded-md bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">98% CONF.</Badge>
                    </div>
                    <div className="space-y-2.5 text-[13px]">
                      {[
                        ["Owner", "Ramesh Patil"],
                        ["Survey no.", "42/3"],
                        ["Village", "Wagholi, Pune"],
                        ["Area", "2.40 Ha"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between border-b border-dashed border-border pb-2 last:border-0 last:pb-0">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="font-mono font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Floating confidence chip */}
                <div className="absolute -left-6 top-8 z-20 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 shadow-xl shadow-black/5 backdrop-blur">
                  <div className="text-[10px] font-bold tracking-wide text-muted-foreground">VALIDATION SCORE</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-2xl font-bold">87</span>
                    <span className="text-[11px] font-semibold text-[var(--success)]">/ 100 · LOW RISK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section id="features" className="border-t border-border/60 bg-card/40 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-14 max-w-xl text-center">
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-primary">CAPABILITIES</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">An intelligent land record platform</h2>
              <p className="mt-4 text-muted-foreground">
                End-to-end digitization, validation and verification — with a full audit trail behind every value.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="group border-border/80 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-black/5">
                  <CardContent className="p-6">
                    <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1.5 font-semibold">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Workflow ──────────────────────────────────────────── */}
        <section id="workflow" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-14 max-w-xl text-center">
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-primary">PIPELINE</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Seven stages, one guided flow</h2>
              <p className="mt-4 text-muted-foreground">
                Every document follows the same traceable path — nothing moves without leaving a mark.
              </p>
            </div>
            <div className="relative">
              <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-7">
                {stages.map(({ label, icon: Icon }, i) => (
                  <div key={label} className="relative flex flex-col items-center gap-3 text-center">
                    <div className={`z-10 grid h-12 w-12 place-items-center rounded-2xl border shadow-sm ${i === 3 ? "border-primary/50 bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "border-border bg-card text-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold">{label}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">STEP {i + 1}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Integration ───────────────────────────────────────── */}
        <section id="integration" className="border-t border-border/60 bg-card/40 py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-primary">INTEGRATION</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Built to sit inside government systems, not replace them.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                A secure API layer connects LANDLENS to the systems land departments already run — records flow
                in, verified data flows back out, and nothing leaves the state&apos;s trust boundary.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: "LRMS", v: "Land Records Management System", icon: Landmark },
                { k: "DILRMP", v: "National digitization mission", icon: Database },
                { k: "GIS", v: "Cadastral map platforms", icon: MapPinned },
                { k: "Registration", v: "State registration systems", icon: FileCheck2 },
              ].map(({ k, v, icon: Icon }) => (
                <Card key={k} className="border-border/80">
                  <CardContent className="p-5">
                    <Icon className="mb-3 h-5 w-5 text-primary" />
                    <div className="font-mono text-base font-bold">{k}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{v}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ──────────────────────────────────────────── */}
        <section id="security" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-14 max-w-xl text-center">
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-primary">SECURITY &amp; ACCESS</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Every action is attributable.</h2>
              <p className="mt-4 text-muted-foreground">
                Role-based access, encrypted storage and a full audit trail on every field that changes.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: Fingerprint, t: "Role-based access", d: "Administrator, officer, verifier, auditor and citizen each see only what their role permits — enforced at the API, not the UI." },
                { icon: Lock, t: "Audit logging", d: "Every extraction, correction and approval is timestamped, attributed and impossible to overwrite." },
                { icon: ShieldCheck, t: "Secure API", d: "Authenticated REST access with scoped tokens for integrating government systems." },
              ].map(({ icon: Icon, t, d }) => (
                <Card key={t} className="border-border/80">
                  <CardContent className="p-6">
                    <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-1.5 font-semibold">{t}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="px-6 pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-sidebar px-8 py-16 text-center text-sidebar-foreground">
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{ background: "radial-gradient(600px 280px at 30% 0%, rgba(248,118,19,0.5), transparent)" }}
            />
            <h2 className="relative mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              See the full digitization workflow in action.
            </h2>
            <p className="relative mx-auto mb-8 max-w-md text-sidebar-foreground/70">
              From a scanned 1962 register to a verified digital record — in one guided walkthrough.
            </p>
            <div className="relative flex flex-wrap justify-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="h-12 rounded-full bg-primary px-7 text-[15px] hover:bg-primary/90">
                    Go to dashboard <ArrowRight className="h-4.5 w-4.5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="h-12 rounded-full bg-primary px-7 text-[15px] hover:bg-primary/90">
                      Create account
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="secondary" className="h-12 rounded-full px-7 text-[15px]">
                      Officer login
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="h-3.5 w-3.5" />
            </span>
            LANDLENS
          </div>
          <p>SIH 2026 prototype · All records shown are illustrative demo data.</p>
        </div>
      </footer>
    </div>
  );
}
