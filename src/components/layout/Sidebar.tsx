"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", ic: "▦" },
  { href: "/upload", label: "Upload record", ic: "⭱" },
  { href: "/processing", label: "AI processing", ic: "⏳" },
  { href: "/extraction", label: "Extracted record", ic: "🔎" },
  { href: "/validation", label: "Validation center", ic: "✓" },
  { href: "/verification", label: "Verification queue", ic: "👤" },
  { href: "/record", label: "Digital records", ic: "🗂" },
];
const bottom = [
  { href: "/gis", label: "GIS / land map", ic: "🗺" },
  { href: "/analytics", label: "Analytics", ic: "📊" },
  { href: "/audit", label: "Audit trail", ic: "🕒" },
];

export default function Sidebar() {
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <aside className="w-[236px] shrink-0 bg-[var(--ink-800)] text-white flex flex-col sticky top-0 h-screen p-[14px] overflow-y-auto">
      <div className="flex items-center gap-2.5 font-extrabold text-[1.05rem] tracking-tight px-2.5 py-3">
        <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--saffron-600)] to-[var(--indigo-500)] inline-block" />
        LANDLENS
      </div>
      <div className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-full text-[11px] text-[#F0DCC2] mb-3 mx-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--saffron-600)]" /> Revenue Officer · Pune
      </div>
      <nav className="flex flex-col gap-0.5">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold transition ${isActive(l.href) ? "bg-[rgba(248,118,19,0.18)] text-white" : "text-[#C9B8A6] hover:bg-white/[0.06] hover:text-white"}`}>
            <span className="w-[18px] text-center text-sm">{l.ic}</span> {l.label}
          </Link>
        ))}
        <div className="h-px bg-white/10 my-3 mx-1.5" />
        {bottom.map((l) => (
          <Link key={l.href} href={l.href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold ${isActive(l.href) ? "bg-[rgba(248,118,19,0.18)] text-white" : "text-[#C9B8A6] hover:bg-white/[0.06] hover:text-white"}`}>
            <span className="w-[18px] text-center">{l.ic}</span> {l.label}
          </Link>
        ))}
        <div className="h-px bg-white/10 my-3 mx-1.5" />
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[#C9B8A6] hover:text-white">
          <span className="w-[18px] text-center">←</span> Exit to landing
        </Link>
      </nav>
      <div className="mt-auto px-2.5 py-3 text-[11px] text-[#B99B7C]">LANDLENS v0.9 · SIH 2026 demo</div>
    </aside>
  );
}
