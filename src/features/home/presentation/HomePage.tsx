import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container py-20 space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            This is a version that helps create a structured database for the team that can in the
            future be transferred to the CRM.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          <Link to="/report">
            <div className="group relative rounded-lg border border-border bg-card p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Report Generator
                  </h2>
                  <p className="text-muted-foreground">
                    Import CSV data, review and edit inline, then generate professional PDF reports
                    with custom branding.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
