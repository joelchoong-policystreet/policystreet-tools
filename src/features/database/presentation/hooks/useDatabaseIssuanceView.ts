import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/data/supabase/client";
import type { Tables } from "@/data/supabase/types";
import {
  parsePurchasedDate,
  filterByDateRange,
  getFilterLabel,
  type FilterPreset,
  type DateRange,
} from "@/features/database/lib/issuance-date-utils";

export type IssuanceRow = Tables<"issuances">;
export type ViewMode = "quotation" | "issuance";

const PAGE_SIZE = 50;

function getBefore6PMCount(rows: IssuanceRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDate(r.purchased_date);
    if (!d) return false;
    return d.getHours() < 18;
  }).length;
}

function getAfter6PMCount(rows: IssuanceRow[]): number {
  return rows.filter((r) => {
    const d = parsePurchasedDate(r.purchased_date);
    if (!d) return false;
    return d.getHours() >= 18;
  }).length;
}

async function fetchIssuances(): Promise<IssuanceRow[]> {
  const { data, error } = await supabase
    .from("issuances")
    .select("*")
    .order("purchased_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export function useDatabaseIssuanceView() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const viewMode: ViewMode = viewParam === "quotation" ? "quotation" : "issuance";

  const [filterPreset, setFilterPreset] = useState<FilterPreset>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: issuanceRows = [], isLoading, error } = useQuery({
    queryKey: ["database-issuances"],
    queryFn: fetchIssuances,
    enabled: viewMode === "issuance",
  });

  const rows = viewMode === "quotation" ? [] : issuanceRows;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPreset, customRange, selectedInsurer, selectedPartner]);

  const dateFilteredRows = useMemo(
    () => filterByDateRange(rows, filterPreset, customRange),
    [rows, filterPreset, customRange]
  );

  const insurerOptions = useMemo(() => {
    const set = new Set(dateFilteredRows.map((r) => r.insurer).filter(Boolean));
    return Array.from(set).sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  }, [dateFilteredRows]);

  const partnerOptions = useMemo(() => {
    const set = new Set(dateFilteredRows.map((r) => r.partner).filter(Boolean));
    return Array.from(set).sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  }, [dateFilteredRows]);

  useEffect(() => {
    if (selectedPartner && partnerOptions.length > 0 && !partnerOptions.includes(selectedPartner)) {
      setSelectedPartner(null);
    }
  }, [selectedPartner, partnerOptions]);

  const filteredRows = useMemo(() => {
    let filtered = dateFilteredRows;
    if (selectedInsurer) filtered = filtered.filter((r) => r.insurer === selectedInsurer);
    if (selectedPartner) filtered = filtered.filter((r) => r.partner === selectedPartner);
    return [...filtered].sort((a, b) => {
      const da = parsePurchasedDate(a.purchased_date)?.getTime() ?? 0;
      const db = parsePurchasedDate(b.purchased_date)?.getTime() ?? 0;
      return sortAsc ? da - db : db - da;
    });
  }, [dateFilteredRows, selectedInsurer, selectedPartner, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const before6PM = useMemo(() => getBefore6PMCount(filteredRows), [filteredRows]);
  const after6PM = useMemo(() => getAfter6PMCount(filteredRows), [filteredRows]);
  const totalCount = filteredRows.length;

  const filterLabel = getFilterLabel(filterPreset, customRange);
  const tableLabel = viewMode === "quotation" ? "Quotation" : "Issuance";
  const emptyMessage =
    viewMode === "quotation"
      ? "No quotation data."
      : rows.length === 0
        ? (isLoading ? "Loading…" : "No issuance data in the database.")
        : "No rows match the current filter.";

  return {
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
    isLoading,
    error,
    pageSize: PAGE_SIZE,
  };
}
