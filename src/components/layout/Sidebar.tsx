"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  BrainCircuit,
  ScanSearch,
  FileCheck2,
  UserCheck,
  Database,
  MapPinned,
  BarChart3,
  History,
  LogOut,
} from "lucide-react";

export const workflowLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload record", icon: Upload },
  { href: "/processing", label: "AI processing", icon: BrainCircuit },
  { href: "/extraction", label: "Extracted record", icon: ScanSearch },
  { href: "/validation", label: "Validation center", icon: FileCheck2 },
  { href: "/verification", label: "Verification queue", icon: UserCheck },
  { href: "/record", label: "Digital records", icon: Database },
];

export const insightLinks = [
  { href: "/gis", label: "GIS / land map", icon: MapPinned },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audit", label: "Audit trail", icon: History },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  const renderLink = ({ href, label, icon: Icon }: (typeof workflowLinks)[number]) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
        isActive(href)
          ? "bg-primary/15 text-white"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      {isActive(href) && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive(href) ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"}`} />
      {label}
    </Link>
  );

  return (
    <nav className="flex flex-col gap-1">
      <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.16em] text-sidebar-foreground/35">
        WORKFLOW
      </p>
      {workflowLinks.map(renderLink)}
      <p className="mb-1.5 mt-5 px-3 text-[10px] font-bold tracking-[0.16em] text-sidebar-foreground/35">
        INSIGHTS
      </p>
      {insightLinks.map(renderLink)}
      <div className="my-4 h-px bg-sidebar-border" />
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <LogOut className="h-4.5 w-4.5 shrink-0 text-sidebar-foreground/50" />
        Exit to landing
      </Link>
    </nav>
  );
}

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto bg-sidebar p-4 text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2.5 px-2 pb-1 pt-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Database className="h-4 w-4" />
        </span>
        <span className="text-[1.05rem] font-bold tracking-tight">LANDLENS</span>
      </div>
      <div className="mx-1 mb-5 mt-4 inline-flex items-center gap-2 self-start rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-medium text-sidebar-foreground/75">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Revenue Officer · Pune
      </div>
      <SidebarNav />
      <div className="mt-auto px-3 pb-2 pt-6 text-[11px] text-sidebar-foreground/35">
        LANDLENS v2.0 · SIH 2026 demo
      </div>
    </aside>
  );
}
