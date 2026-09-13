"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage, type Testimonial } from "@/components/ui/sign-in";
import { signIn } from "@/lib/auth";

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Anjali Deshmukh",
    handle: "Land Records Officer · Pune Collectorate",
    text: "LANDLENS cut our digitization backlog from months to days. The AI extraction flags exactly where my review matters — I have never trusted a pipeline this quickly.",
    avatarSrc:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
  },
  {
    name: "Rahul Kulkarni",
    handle: "Verification Officer · Settlement Dept.",
    text: "Every extracted field carries its evidence and confidence score. Approving a 1962 register entry now takes minutes instead of an afternoon with the paper file.",
    avatarSrc:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80",
  },
  {
    name: "Sunita Patil",
    handle: "Tahsildar · Haveli Tehsil",
    text: "The audit trail is airtight — every correction, every approval, every glance is logged. That is what modern land governance should feel like.",
    avatarSrc:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&q=80",
  },
];

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (email: string, password: string) => {
    setError("");
    setLoading(true);
    try {
      const { error: err } = await signIn(email, password);
      if (err) throw err;
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignInPage
      title="Officer Sign In"
      description="Welcome back. Sign in to access the LANDLENS digitization console."
      heroImageSrc="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80"
      testimonials={TESTIMONIALS}
      onSignIn={handleSignIn}
      onGoogleSignIn={() =>
        setError("Google SSO is not available in this prototype — use officer credentials.")
      }
      onResetPassword={() =>
        setError("Password reset is handled by your district administrator in this prototype.")
      }
      onCreateAccount={() => router.push("/signup")}
      loading={loading}
      error={error}
      footerNote={
        <div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4 backdrop-blur-md">
          <p className="mb-2 text-xs font-semibold text-indigo-600">Demo Credentials</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Email:</strong> operator@landlens.local
            </p>
            <p>
              <strong>Password:</strong> operator123
            </p>
          </div>
        </div>
      }
    />
  );
}
