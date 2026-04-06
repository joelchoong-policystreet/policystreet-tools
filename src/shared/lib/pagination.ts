/**
 * Builds a compact page list: at most `maxNumbers` page indices, with ellipses
 * when there are gaps (always includes page 1 and last when truncated).
 */
export function getPaginationPageItems(
  currentPage: number,
  totalPages: number,
  maxNumbers = 9
): (number | "ellipsis")[] {
  if (totalPages <= maxNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "ellipsis")[] = [];
  const innerMax = maxNumbers - 2;
  let innerStart = Math.max(2, currentPage - Math.floor(innerMax / 2));
  let innerEnd = innerStart + innerMax - 1;
  if (innerEnd >= totalPages) {
    innerEnd = totalPages - 1;
    innerStart = Math.max(2, innerEnd - innerMax + 1);
  }

  items.push(1);
  if (innerStart > 2) items.push("ellipsis");
  for (let p = innerStart; p <= innerEnd; p++) items.push(p);
  if (innerEnd < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}
