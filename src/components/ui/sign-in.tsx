"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface Testimonial {
  name: string;
  handle: string;
  text: string;
  avatarSrc?: string;
}

export interface SignInPageProps {
  title?: string;
  description?: string;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (email: string, password: string) => Promise<void> | void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  loading?: boolean;
  error?: string;
  footerNote?: React.ReactNode;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-foreground/10 bg-foreground/5 backdrop-blur-md transition-colors duration-200 focus-within:border-violet-400/70 focus-within:bg-foreground/10 hover:bg-foreground/10">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <figure
    role="figure"
    aria-label={`Testimonial from ${testimonial.name}`}
    className={`animate-testimonial ${delay} max-w-md rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md`}
  >
    <blockquote className="text-sm leading-relaxed text-white/90">
      “{testimonial.text}”
    </blockquote>
    <figcaption className="mt-4 flex items-center gap-3">
      {testimonial.avatarSrc && (
        <img
          src={testimonial.avatarSrc}
          alt={`${testimonial.name} avatar`}
          loading="lazy"
          width={36}
          height={36}
          className="rounded-full object-cover ring-2 ring-white/20"
        />
      )}
      <div>
        <div className="text-sm font-semibold text-white">{testimonial.name}</div>
        <div className="text-xs text-white/60">{testimonial.handle}</div>
      </div>
    </figcaption>
  </figure>
);

export function SignInPage({
  title = "Sign in",
  description = "Welcome back! Sign in to your account",
  heroImageSrc = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80",
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  loading = false,
  error,
  footerNote,
}: SignInPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn?.(email, password);
  };

  return (
    <div className="animate-fade-slide-in min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ── Left: hero + testimonials ── */}
        <div className="relative hidden overflow-hidden lg:block">
          <img
            src={heroImageSrc}
            alt="Land records hero"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10">
            <div className="animate-element animate-delay-100 flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
              <span className="h-3 w-3 rounded-[4px] bg-gradient-to-br from-saffron-500 to-indigo-400" />
              LANDLENS
            </div>

            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <TestimonialCard
                  key={t.handle}
                  testimonial={t}
                  delay={i === 0 ? "animate-delay-400" : i === 1 ? "animate-delay-600" : "animate-delay-800"}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: form ── */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="animate-slide-right w-full max-w-md">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center gap-2 text-xl font-extrabold tracking-tight lg:hidden">
              <span className="h-3 w-3 rounded-[4px] bg-gradient-to-br from-saffron-500 to-indigo-400" />
              LANDLENS
            </div>

            <h1 className="animate-element animate-delay-100 text-3xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="animate-element animate-delay-200 mt-2 text-sm text-muted-foreground">
              {description}
            </p>

            {error && (
              <div
                role="alert"
                className="animate-element animate-delay-200 mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 backdrop-blur-md"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="animate-element animate-delay-300">
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  Officer Email
                </label>
                <GlassInputWrapper>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@landlens.local"
                    className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70"
                    autoComplete="email"
                    required
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={onResetPassword}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    Forgot password?
                  </button>
                </div>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent px-4 py-3 pr-12 text-sm outline-none placeholder:text-muted-foreground/70"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="animate-element animate-delay-500 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="animate-element animate-delay-600 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={onGoogleSignIn}
                className="animate-element animate-delay-700 flex w-full items-center justify-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm font-medium backdrop-blur-md transition-all duration-200 hover:bg-foreground/10 active:scale-[0.98]"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="animate-element animate-delay-800 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={onCreateAccount}
                  className="font-semibold text-primary transition-colors hover:underline"
                >
                  Register
                </button>
              </p>

              {footerNote && (
                <div className="animate-element animate-delay-900">{footerNote}</div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInPage;
