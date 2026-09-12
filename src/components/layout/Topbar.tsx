"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { pageTitles } from "@/data/workflow";
import { SidebarNav } from "@/components/layout/Sidebar";
import { useCaseStore } from "@/store/case-store";

const LANGS = ["English", "मराठी", "हिंदी"];

export default function Topbar() {
  const router = useRouter();
  const path = usePathname();
  const seg = path.split("/").filter(Boolean)[0] ?? "dashboard";
  const title = pageTitles[seg] ?? seg;
  const { currentCase } = useCaseStore();
  const [lang, setLang] = useState("English");
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = "RD";

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl md:px-7">
      {/* Mobile menu */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[264px] bg-sidebar p-4 text-sidebar-foreground [&>button]:text-white">
            <SheetHeader className="p-0 pb-4 text-left">
              <SheetTitle className="flex items-center gap-2.5 text-white">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 3L2 9h20L12 3zm-7 8v7h3v-7H5zm5 0v7h2v-7h-2zm5 0v7h3v-7h-3zM3 20v2h18v-2H3z"/></svg>
                </span>
                LANDLENS
              </SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
        <p className="hidden truncate font-mono text-[11px] text-muted-foreground sm:block">
          {currentCase.recId} · {currentCase.village}, {currentCase.district}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden items-center rounded-full border border-border bg-card p-0.5 sm:flex">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                lang === l
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-semibold lg:block">R. Deshmukh</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">R. Deshmukh</div>
              <div className="text-xs font-normal text-muted-foreground">Revenue Officer · Pune</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg">
              <UserRound className="h-4 w-4" /> View profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-lg text-destructive focus:text-destructive"
              onClick={() => router.push("/")}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
