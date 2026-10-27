import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { NoteItem } from "../types";

export function HighlightsCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: NoteItem[];
}) {
  return (
    <Card className="rounded-2xl border-2 border-primary/25 bg-primary/[0.04] shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No highlights for this period yet.</p>
        ) : (
          <div className="grid gap-x-7 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((it) => (
              <div key={it.h} className="space-y-1">
                <p className="text-[15px] font-semibold">{it.h}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{it.b}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
