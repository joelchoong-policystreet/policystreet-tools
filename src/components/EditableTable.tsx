import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { COLUMNS, type ReportRow } from "@/lib/sample-data";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditableTableProps {
  data: ReportRow[];
  onChange: (data: ReportRow[]) => void;
}

export function EditableTable({ data, onChange }: EditableTableProps) {
  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);

  const handleChange = (rowIdx: number, key: string, value: string) => {
    const updated = data.map((row, i) => {
      if (i !== rowIdx) return row;
      if (key === "quantity" || key === "amount") {
        return { ...row, [key]: Number(value) || 0 };
      }
      return { ...row, [key]: value };
    });
    onChange(updated);
  };

  const deleteRow = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  const statusColor = (s: string) => {
    if (s === "Delivered") return "default";
    if (s === "Pending") return "secondary";
    return "outline";
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {COLUMNS.map((col) => {
                const isEditing = editing?.row === rowIdx && editing?.col === col.key;
                const value = row[col.key as keyof ReportRow];
                return (
                  <TableCell
                    key={col.key}
                    className="cursor-pointer"
                    onClick={() => setEditing({ row: rowIdx, col: col.key })}
                  >
                    {isEditing ? (
                      <Input
                        autoFocus
                        defaultValue={String(value)}
                        className="h-8 text-sm"
                        onBlur={(e) => {
                          handleChange(rowIdx, col.key, e.target.value);
                          setEditing(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChange(rowIdx, col.key, (e.target as HTMLInputElement).value);
                            setEditing(null);
                          }
                        }}
                      />
                    ) : col.key === "status" ? (
                      <Badge variant={statusColor(String(value))}>{String(value)}</Badge>
                    ) : col.key === "amount" ? (
                      `$${Number(value).toLocaleString()}`
                    ) : (
                      String(value)
                    )}
                  </TableCell>
                );
              })}
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteRow(rowIdx)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
