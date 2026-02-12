import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportRow } from "./sample-data";
import { COLUMNS } from "./sample-data";

export function generatePDF(data: ReportRow[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Acme Corporation", 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Inventory Report", 14, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35);
  doc.text(`Total Records: ${data.length}`, pageWidth - 14, 35, { align: "right" });

  // Summary bar
  const totalAmount = data.reduce((s, r) => s + r.amount, 0);
  const totalQty = data.reduce((s, r) => s + r.quantity, 0);
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(0, 42, pageWidth, 14, "F");
  doc.setFontSize(9);
  doc.text(`Total Items: ${totalQty}`, 14, 51);
  doc.text(`Total Amount: $${totalAmount.toLocaleString()}`, pageWidth / 2, 51, { align: "center" });
  const statuses = [...new Set(data.map((r) => r.status))].join(", ");
  doc.text(`Statuses: ${statuses}`, pageWidth - 14, 51, { align: "right" });

  // Table
  autoTable(doc, {
    startY: 62,
    head: [COLUMNS.map((c) => c.label)],
    body: data.map((row) =>
      COLUMNS.map((c) => {
        const val = row[c.key as keyof ReportRow];
        if (c.key === "amount") return `$${Number(val).toLocaleString()}`;
        return String(val);
      })
    ),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text("Confidential — Acme Corporation", 14, pageHeight - 10);
  }

  doc.save("report.pdf");
}
