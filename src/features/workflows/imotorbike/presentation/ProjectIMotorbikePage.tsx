import { useParams } from "react-router-dom";
import { WORKFLOWS } from "@/features/layout/presentation/ProjectPanel";
import { useIMotorbikeProjectView } from "./hooks/useIMotorbikeProjectView";
import { ProjectPageHeader } from "./components/ProjectPageHeader";
import { ProjectTabs } from "./components/ProjectTabs";
import { IssuanceTabFilters } from "./components/IssuanceTabFilters";
import { ProjectStatsCards } from "./components/ProjectStatsCards";
import { IssuanceTabTable } from "./components/IssuanceTabTable";
import { InsurerBillingTabContent } from "./components/InsurerBillingTabContent";
import { OcrTabContent } from "./components/OcrTabContent";

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
              before6PM={view.before6PM}
              after6PM={view.after6PM}
              total={view.totalIssuances}
              totalLabel="Total Issuances"
            />
            <IssuanceTabTable
              rows={view.paginatedRows}
              emptyMessage={issuanceEmptyMessage}
              sortAsc={view.sortAsc}
              onSortToggle={() => view.setSortAsc((a) => !a)}
              currentPage={view.currentPage}
              totalPages={view.totalPages}
              totalItems={view.filteredRows.length}
              pageSize={view.pageSize}
              onPageChange={view.setCurrentPage}
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
            rows={view.billingPaginated}
            isLoading={view.isLoadingBilling}
            error={view.errorBilling as Error | null}
            uploadError={view.billingUploadError}
            totalItems={view.billingFiltered.length}
            emptyMessage={billingEmptyMessage}
            sortAsc={view.sortAsc}
            onSortToggle={() => view.setSortAsc((a) => !a)}
            currentPage={view.currentPage}
            totalPages={view.billingTotalPages}
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
            rows={view.ocrPaginated}
            isLoading={view.isLoadingOcr}
            error={view.errorOcr as Error | null}
            totalItems={view.ocrSorted.length}
            emptyMessage={ocrEmptyMessage}
            sortAsc={view.sortAsc}
            onSortToggle={() => view.setSortAsc((a) => !a)}
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
