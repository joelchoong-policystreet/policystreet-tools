import { useState } from "react";
import { FileDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataImport } from "@/components/DataImport";
import { EditableTable } from "@/components/EditableTable";
import { SAMPLE_DATA, type ReportRow } from "@/lib/sample-data";
import { generatePDF } from "@/lib/pdf-generator";
import { toast } from "@/hooks/use-toast";

export default function ReportPage() {
  const [data, setData] = useState<ReportRow[]>(SAMPLE_DATA);

  const handleGenerate = () => {
    if (data.length === 0) {
      toast({ title: "No data", description: "Import or add data before generating.", variant: "destructive" });
      return;
    }
    generatePDF(data);
    toast({ title: "PDF Downloaded", description: "Your report has been generated." });
  };

  const handleReset = () => {
    setData(SAMPLE_DATA);
    toast({ title: "Reset", description: "Sample data restored." });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Report Generator</h1>
            <p className="text-sm text-muted-foreground">Import, review & export as PDF</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={handleGenerate}>
              <FileDown className="mr-2 h-4 w-4" /> Generate PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <DataImport onImport={(rows) => setData(rows)} />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{data.length} records — click any cell to edit</p>
        </div>

        <EditableTable data={data} onChange={setData} />
      </main>
    </div>
  );
}
