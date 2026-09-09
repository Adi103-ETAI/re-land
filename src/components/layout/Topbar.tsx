"use client";
import { usePathname } from "next/navigation";
import { pageTitles } from "@/data/workflow";

export default function Topbar() {
  const path = usePathname();
  const seg = path.split("/").filter(Boolean)[0] ?? "dashboard";
  const title = pageTitles[seg] ?? seg;
  return (
    <div className="h-16 flex items-center justify-between px-7 bg-white border-b border-[var(--border-hairline)] sticky top-0 z-20">
      <h1 className="text-[15px] font-semibold text-[var(--ink-800)] capitalize">{title}</h1>
      <div className="flex items-center gap-3.5">
        <div className="flex gap-2 text-xs text-[var(--gray-600)]">
          <span className="font-bold text-[var(--saffron-600)] cursor-pointer">English</span>
          <span className="cursor-pointer">मराठी</span>
          <span className="cursor-pointer">हिंदी</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--saffron-600)] to-[#3C415B] text-white flex items-center justify-center text-xs font-bold">RO</div>
      </div>
    </div>
  );
}
