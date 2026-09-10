"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pageTitles } from "@/data/workflow";

export default function Topbar() {
  const router = useRouter();
  const path = usePathname();
  const seg = path.split("/").filter(Boolean)[0] ?? "dashboard";
  const title = pageTitles[seg] ?? seg;
  const [lang, setLang] = useState("English");
  const [showProfile, setShowProfile] = useState(false);
  return (
    <div className="h-16 flex items-center justify-between px-7 bg-white border-b border-[var(--border-hairline)] sticky top-0 z-20">
      <h1 className="text-[15px] font-semibold text-[var(--ink-800)] capitalize">{title}</h1>
      <div className="flex items-center gap-3.5 relative">
        <div className="flex gap-2 text-xs">
          {["English","मराठी","हिंदी"].map(l=>(
            <button key={l} onClick={()=>setLang(l)} className={`px-2 py-1 rounded-full ${lang===l ? "font-bold text-[var(--saffron-600)] bg-[#FFF3EA]" : "text-[var(--gray-600)] hover:bg-[var(--surface-raised)]"}`}>{l}</button>
          ))}
        </div>
        <button onClick={()=>setShowProfile(!showProfile)} className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--saffron-600)] to-[#3C415B] text-white flex items-center justify-center text-xs font-bold hover:opacity-90">RO</button>
        {showProfile && (
          <div className="absolute top-12 right-0 bg-white border border-[var(--border-hairline)] rounded-xl shadow-lg p-3 w-56 z-30">
            <div className="text-sm font-semibold">R. Deshmukh</div><div className="text-xs text-[var(--gray-600)]">Revenue Officer · Pune</div>
            <div className="h-px bg-[var(--border-hairline)] my-2" />
            <button onClick={()=>{setShowProfile(false); alert("Profile — coming soon");}} className="text-xs text-[var(--gray-600)] w-full text-left py-1 hover:text-[var(--ink-800)]">View profile</button>
            <button onClick={()=>{setShowProfile(false); router.push("/");}} className="text-xs text-[var(--error)] w-full text-left py-1">Sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}
