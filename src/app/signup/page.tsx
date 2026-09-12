"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signUp, type UserRole } from "@/lib/supabase";

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: "operator", label: "Field Operator", desc: "Document upload and initial extraction" },
  { value: "verifier", label: "Verifier", desc: "Review and validate extracted records" },
  { value: "senior", label: "Senior Officer", desc: "Approve high-risk findings" },
  { value: "auditor", label: "Auditor", desc: "Access full audit trails" },
  { value: "admin", label: "Administrator", desc: "System management" },
];

function GlassField({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/50 focus-within:bg-primary/5">
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/70";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "operator" as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match", description: "Re-enter both passwords and try again." });
      return;
    }
    if (form.password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 6 characters." });
      return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.name, form.role);
      router.push("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: err?.message || "Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-[100dvw] flex-col font-geist md:flex-row">
      {/* Left column: signup form */}
      <section className="flex flex-1 items-center justify-center overflow-y-auto p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="animate-element animate-delay-100 flex items-center gap-2.5">
              <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Landmark className="h-4 w-4" />
                </span>
                LANDLENS
              </Link>
            </div>
            <div>
              <h1 className="animate-element animate-delay-200 text-4xl font-semibold leading-tight tracking-tighter">
                Create your <span className="font-light">account</span>
              </h1>
              <p className="animate-element animate-delay-300 mt-3 text-sm text-muted-foreground">
                Register as a land department officer to start digitizing records.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <GlassField>
                  <input name="name" value={form.name} onChange={set("name")} placeholder="e.g. R. Deshmukh" className={inputCls} required />
                </GlassField>
              </div>

              <div className="animate-element animate-delay-500">
                <label className="text-sm font-medium text-muted-foreground">Officer Email</label>
                <GlassField>
                  <input name="email" type="email" value={form.email} onChange={set("email")} placeholder="officer@landlens.local" className={inputCls} required />
                </GlassField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="animate-element animate-delay-600">
                  <label className="text-sm font-medium text-muted-foreground">Password</label>
                  <GlassField>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={set("password")}
                        placeholder="Min. 6 characters"
                        className={inputCls + " pr-10"}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                        {showPassword ? <EyeOff className="h-4.5 w-4.5 text-muted-foreground transition-colors hover:text-foreground" /> : <Eye className="h-4.5 w-4.5 text-muted-foreground transition-colors hover:text-foreground" />}
                      </button>
                    </div>
                  </GlassField>
                </div>
                <div className="animate-element animate-delay-600">
                  <label className="text-sm font-medium text-muted-foreground">Confirm</label>
                  <GlassField>
                    <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Repeat password" className={inputCls} required />
                  </GlassField>
                </div>
              </div>

              <div className="animate-element animate-delay-700">
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <GlassField>
                  <select
                    name="role"
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                    className={inputCls + " cursor-pointer appearance-none"}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value} className="bg-card text-foreground">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </GlassField>
                <p className="mt-1.5 text-xs text-muted-foreground">{ROLES.find((r) => r.value === form.role)?.desc}</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="animate-element animate-delay-800 h-[52px] w-full rounded-2xl text-[15px] font-medium shadow-lg shadow-primary/20"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Creating account…" : "Create Account"}
              </Button>
            </form>

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary transition-colors hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      <section className="relative hidden flex-1 p-4 md:block">
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2070&auto=format&fit=crop)",
          }}
        />
        <div className="absolute bottom-12 left-1/2 z-10 w-[calc(100%-8rem)] -translate-x-1/2 rounded-3xl border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
          <p className="text-sm leading-relaxed text-white/90">
            &ldquo;Digitization here isn&apos;t about replacing officers — it&apos;s about giving every officer a
            head start. The AI reads, the officer decides.&rdquo;
          </p>
          <p className="mt-3 text-xs text-white/60">LANDLENS design principle · SIH 2026</p>
        </div>
      </section>
    </div>
  );
}
