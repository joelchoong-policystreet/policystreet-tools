import { useRef, useState } from "react";
import { Upload, FileText, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parseCSV } from "@/lib/csv-parser";
import type { ReportRow } from "@/lib/sample-data";

interface DataImportProps {
  onImport: (rows: ReportRow[]) => void;
}

export function DataImport({ onImport }: DataImportProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await parseCSV(file);
    onImport(rows);
  };

  const handlePaste = async () => {
    if (!csvText.trim()) return;
    const rows = await parseCSV(csvText);
    onImport(rows);
    setCsvText("");
    setPasteMode(false);
  };

  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        {!pasteMode ? (
          <>
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Upload a CSV file or paste data</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" /> Upload CSV
              </Button>
              <Button variant="outline" onClick={() => setPasteMode(true)}>
                <ClipboardPaste className="mr-2 h-4 w-4" /> Paste Data
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </>
        ) : (
          <>
            <Textarea
              placeholder={"Report ID,Date,Item Name,Quantity,Amount,Status\nRPT-001,2026-01-15,Chairs,10,500,Delivered"}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
            <div className="flex gap-3">
              <Button onClick={handlePaste}>Import</Button>
              <Button variant="ghost" onClick={() => setPasteMode(false)}>Cancel</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
