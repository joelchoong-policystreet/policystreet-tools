import type { LucideIcon } from "lucide-react";
import { Building2, LayoutGrid } from "lucide-react";

import type { MilestoneBoardRow } from "../data/milestoneBoardsApi";

export type MilestoneBoard = {
  id: string;
  label: string;
  icon: LucideIcon;
};

/** Default route when no board is selected / invalid board. */
export const DEFAULT_MILESTONE_BOARD_ID = "motor-biz";

/** Icon for sidebar: built-in Motor Biz uses Building2; other DB boards use a neutral icon. */
export function milestoneBoardIcon(boardId: string): LucideIcon {
  if (boardId === "motor-biz") return Building2;
  return LayoutGrid;
}

export function milestoneBoardRowToPanel(board: MilestoneBoardRow | { id: string; label: string }): MilestoneBoard {
  return {
    id: board.id,
    label: board.label,
    icon: milestoneBoardIcon(board.id),
  };
}
