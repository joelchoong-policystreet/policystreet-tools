import { Database as DatabaseIcon } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { useDatabaseIssuanceView } from "./hooks/useDatabaseIssuanceView";
import { DatabaseViewTabs } from "./components/DatabaseViewTabs";
import { IssuanceFilters } from "./components/IssuanceFilters";
import { IssuanceStatsCards } from "./components/IssuanceStatsCards";
import { IssuanceTable } from "./components/IssuanceTable";

export default function DatabasePage() {
  const {
    viewMode,
    filterPreset,
    setFilterPreset,
    customRange,
    setCustomRange,
    selectedInsurer,
    setSelectedInsurer,
    selectedPartner,
    setSelectedPartner,
    sortAsc,
    setSortAsc,
    currentPage,
    setCurrentPage,
    insurerOptions,
    partnerOptions,
    paginatedRows,
    filteredRows,
    totalPages,
    totalCount,
    before6PM,
    after6PM,
    filterLabel,
    tableLabel,
    emptyMessage,
    error,
    pageSize,
  } = useDatabaseIssuanceView();

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div className="mb-6">
          <PageHeader
            icon={DatabaseIcon}
            title="Database"
            description="View quotation and issuance data"
          />
        </div>

        <DatabaseViewTabs viewMode={viewMode} />

        {viewMode === "issuance" && (
          <IssuanceFilters
            filterLabel={filterLabel}
            filterPreset={filterPreset}
            onFilterPresetChange={setFilterPreset}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            selectedInsurer={selectedInsurer}
            onInsurerChange={setSelectedInsurer}
            insurerOptions={insurerOptions}
            selectedPartner={selectedPartner}
            onPartnerChange={setSelectedPartner}
            partnerOptions={partnerOptions}
          />
        )}

        <IssuanceStatsCards
          before6PM={before6PM}
          after6PM={after6PM}
          totalCount={totalCount}
          tableLabel={tableLabel}
        />

        <IssuanceTable
          rows={paginatedRows}
          emptyMessage={emptyMessage}
          sortAsc={sortAsc}
          onSortToggle={() => setSortAsc((a) => !a)}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          error={viewMode === "issuance" ? (error as Error | null) : null}
        />
      </main>
    </div>
  );
}
