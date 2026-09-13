"use client";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shown instead of a page's content when Supabase credentials have not
 * been filled in yet (.env.local). Replaces all former demo/mock data.
 */
export function SetupNotice({ what }: { what?: string }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" /> Connect Supabase to continue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          {what
            ? `${what} is stored in Supabase, but no credentials are configured yet — so there is nothing to show.`
            : "This data is stored in Supabase, but no credentials are configured yet — so there is nothing to show."}
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
          <li>
            Create a project at <span className="font-mono text-foreground">supabase.com</span>
          </li>
          <li>
            Run the SQL from <span className="font-mono text-foreground">supabase/schema.sql</span> in the
            project&apos;s SQL Editor (or the <span className="font-mono text-foreground">supabase/migrations/</span>{" "}
            files in order)
          </li>
          <li>
            Copy <span className="font-mono text-foreground">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="font-mono text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> from Project
            Settings → API into <span className="font-mono text-foreground">.env.local</span>
          </li>
          <li>Restart the dev server</li>
        </ol>
      </CardContent>
    </Card>
  );
}

/** Generic empty state (no rows in the database yet). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed border-border/80">
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        {Icon && (
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <p className="font-semibold">{title}</p>
          {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
