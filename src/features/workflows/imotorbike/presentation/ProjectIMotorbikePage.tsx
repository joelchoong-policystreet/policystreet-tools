import { useParams } from "react-router-dom";
import Papa from "papaparse";
import { supabase } from "@/data/supabase/client";
import { WORKFLOWS } from "@/features/layout/presentation/ProjectPanel";
import { useIMotorbikeProjectView } from "./hooks/useIMotorbikeProjectView";
import { ProjectPageHeader } from "./components/ProjectPageHeader";
import { ProjectTabs } from "./components/ProjectTabs";
import { IssuanceTabFilters } from "./components/IssuanceTabFilters";
import { ProjectStatsCards } from "./components/ProjectStatsCards";
import { IssuanceTabTable } from "./components/IssuanceTabTable";
import { InsurerBillingTabContent } from "./components/InsurerBillingTabContent";
import { OcrTabContent } from "./components/OcrTabContent";
import { ErrorsTabContent } from "./components/ErrorsTabContent";

export default function ProjectIMotorbikePage() {
  const { workflowId, projectId } = useParams<{ workflowId: string; projectId: string }>();
  const workflow = workflowId ? WORKFLOWS[workflowId] : null;
  const project = workflow?.projects.find((p) => p.id === projectId);
  const Icon = project?.icon;
  const label = project?.label ?? projectId ?? "Project";

  if (!workflowId || !projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Select a project.</p>
      </div>
    );
  }

  const view = useIMotorbikeProjectView();

  const issuanceEmptyMessage =
    view.rows.length === 0
      ? "Upload a CSV to see data."
      : "No rows match the current filter.";

  const billingEmptyMessage =
    view.insurerBillingRows.length === 0
      ? "No insurer billing data. Upload a CSV."
      : "No rows match the filter.";

  const ocrEmptyMessage =
    view.ocrRows.length === 0
      ? "No OCR data. Upload a CSV."
      : "No rows.";

  const errorsEmptyMessage =
    view.uploadErrorRows.length === 0
      ? "No rejected rows. Rows skipped during CSV upload (e.g. no valid date) will appear here."
      : "No rows match the search.";

  const handleExport = async () => {
    const dataToExport = view.searchFilteredRows.map(row => {
      const vStatus = view.verificationStatuses[row.id] || "pending";
      let finalStatus = "Incomplete";
      if (row.total_amount_payable != null && String(row.total_amount_payable).trim() !== "") {
        finalStatus = "Completed";
      } else if (vStatus === "cancelled_billed") {
        finalStatus = "Completed (Verified)";
      } else if (vStatus === "cancelled_not_billed") {
        finalStatus = "Issuance Cancelled";
      } else {
        finalStatus = "Verification Required";
      }

      return {
        "Issue Date": row.issue_date || "",
        "Client Name": row.client_name || "",
        "Vehicle No": row.vehicle_no || "",
        "Sum Insured (RM)": row.sum_insured != null ? Number(row.sum_insured).toFixed(2) : "",
        "Premium": row.premium != null ? Number(row.premium).toFixed(2) : "",
        "NCD": row.ncd != null ? Number(row.ncd).toFixed(2) : "",
        "Total Base Premium": row.total_base_premium != null ? Number(row.total_base_premium).toFixed(2) : "",
        "Total Extra Coverage": row.total_extra_coverage != null ? Number(row.total_extra_coverage).toFixed(2) : "",
        "Gross Premium": row.gross_premium != null ? Number(row.gross_premium).toFixed(2) : "",
        "Service Tax": row.service_tax != null ? Number(row.service_tax).toFixed(2) : "",
        "Stamp Duty": row.stamp_duty != null ? Number(row.stamp_duty).toFixed(2) : "",
        "Total Amount Payable (RM)": row.total_amount_payable != null ? Number(row.total_amount_payable).toFixed(2) : "",
        "Insurer": row.insurer_billing_data?.insurer || "",
        "Verification Status": finalStatus
      };
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `imotorbike_issuance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Audit Log tracking
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      user_name: user?.email || "Unknown User",
      event_type: "Workflow",
      change: "CSV exported",
      item_affected: `${projectId || 'General'} - ${dataToExport.length} rows`
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <ProjectPageHeader icon={Icon} label={label} />
        <ProjectTabs activeTab={view.activeTab} onTabChange={view.setActiveTab} />

        {view.activeTab === "issuance" && (
          <>
            <IssuanceTabFilters
              lastUpdated={view.lastUpdated}
              fileInputRef={view.fileInputRef}
              onFileChange={view.handleIssuanceFileChange}
              onExport={handleExport}
              searchQuery={view.searchQuery}
              onSearchChange={view.setSearchQuery}
              filterLabel={view.filterLabel}
              filterPreset={view.filterPreset}
              onFilterPresetChange={view.setFilterPreset}
              customRange={view.customRange}
              onCustomRangeChange={view.setCustomRange}
              selectedInsurer={view.selectedInsurer}
              onInsurerChange={view.setSelectedInsurer}
              insurerOptions={view.insurerOptions}
            />
            <ProjectStatsCards
              completeCount={view.completeData}
              incompleteCount={view.incompleteData}
              cancelledCount={view.cancelledData}
              total={view.totalIssuances}
              totalLabel="Total Issuances"
              onFilterChange={view.setIssuanceFilter}
              activeFilter={view.issuanceFilter}
            />
            <IssuanceTabTable
              rows={view.paginatedRows}
              emptyMessage={issuanceEmptyMessage}
              sortAsc={view.sortAsc}
              onSortToggle={() => view.setSortAsc((a) => !a)}
              currentPage={view.currentPage}
              totalPages={view.totalPages}
              totalItems={view.searchFilteredRows.length}
              pageSize={view.pageSize}
              onPageChange={view.setCurrentPage}
              verificationStatuses={view.verificationStatuses}
              onVerificationStatusChange={view.handleVerificationStatusChange}
            />
          </>
        )}

        {view.activeTab === "insurer_billing" && (
          <InsurerBillingTabContent
            companyId={view.companyId}
            uploading={view.uploading}
            fileInputRef={view.billingFileInputRef}
            onFileChange={view.handleBillingFileChange}
            onConfirmInsurerAndOpenFilePicker={(insurer) => {
              view.prepareBillingUpload(insurer);
              view.billingFileInputRef.current?.click();
            }}
            filterLabel={view.filterLabel}
            filterPreset={view.filterPreset}
            onFilterPresetChange={view.setFilterPreset}
            customRange={view.customRange}
            onCustomRangeChange={view.setCustomRange}
            selectedInsurer={view.selectedInsurerBilling}
            onInsurerChange={view.setSelectedInsurerBilling}
            insurerOptions={view.billingInsurerOptions}
            searchQuery={view.billingSearchQuery}
            onSearchChange={view.setBillingSearchQuery}
            rows={view.billingPaginated}
            isLoading={view.isLoadingBilling}
            error={view.errorBilling as Error | null}
            uploadError={view.billingUploadError}
            totalItems={view.billingSearchFiltered.length}
            emptyMessage={billingEmptyMessage}
            sortAsc={view.sortAsc}
            onSortToggle={() => view.setSortAsc((a) => !a)}
            currentPage={view.currentPage}
            totalPages={view.billingTotalPages}
            pageSize={view.pageSize}
            onPageChange={view.setCurrentPage}
          />
        )}

        {view.activeTab === "errors" && (
          <ErrorsTabContent
            searchQuery={view.errorsSearchQuery}
            onSearchChange={view.setErrorsSearchQuery}
            rows={view.errorsPaginated}
            isLoading={view.isLoadingErrors}
            error={view.errorErrors as Error | null}
            totalItems={view.errorsSearchFiltered.length}
            emptyMessage={errorsEmptyMessage}
            currentPage={view.currentPage}
            totalPages={view.errorsTotalPages}
            pageSize={view.pageSize}
            onPageChange={view.setCurrentPage}
          />
        )}

        {view.activeTab === "ocr" && (
          <OcrTabContent
            companyId={view.companyId}
            uploading={view.uploading}
            fileInputRef={view.ocrFileInputRef}
            onFileChange={view.handleOcrFileChange}
            searchQuery={view.ocrSearchQuery}
            onSearchChange={view.setOcrSearchQuery}
            lastUpdated={view.ocrLastUpdated}
            rows={view.ocrPaginated}
            isLoading={view.isLoadingOcr}
            error={view.errorOcr as Error | null}
            totalItems={view.ocrSearchFiltered.length}
            emptyMessage={ocrEmptyMessage}
            sortBy={view.ocrSortBy}
            sortAsc={view.ocrSortAsc}
            onSortByChange={view.setOcrSortBy}
            onSortToggle={() => view.setOcrSortAsc((a) => !a)}
            currentPage={view.currentPage}
            totalPages={view.ocrTotalPages}
            pageSize={view.pageSize}
            onPageChange={view.setCurrentPage}
          />
        )}
      </main>
    </div>
  );
}
