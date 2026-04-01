import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_MILESTONE_BOARD_ID,
  milestoneBoardRowToPanel,
} from "@/features/milestones/config/milestoneBoards";
import {
  createMilestoneBoard,
  fetchMilestoneBoards,
} from "@/features/milestones/data/milestoneBoardsApi";

function useMilestoneBoardParams() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/milestones\/([^/]+)/);
  if (!match) return { boardId: null };
  return { boardId: match[1] ?? null };
}

export function MilestoneBoardPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { boardId } = useMilestoneBoardParams();
  const [optimisticBoardId, setOptimisticBoardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const { data: boardRows = [] } = useQuery({
    queryKey: ["milestone-boards"],
    queryFn: fetchMilestoneBoards,
  });

  const boards = boardRows.map(milestoneBoardRowToPanel);

  const createMutation = useMutation({
    mutationFn: createMilestoneBoard,
    onSuccess: (row) => {
      void queryClient.invalidateQueries({ queryKey: ["milestone-boards"] });
      setNewBoardName("");
      setCreateOpen(false);
      setOptimisticBoardId(row.id);
      navigate(`/milestones/${row.id}`);
      toast.success("Board created.");
    },
    onError: (e: unknown) => {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Could not create board.";
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (boardId) setOptimisticBoardId(null);
  }, [boardId]);

  const displayBoardId = optimisticBoardId ?? boardId ?? DEFAULT_MILESTONE_BOARD_ID;

  const handleCreateBoard = () => {
    const trimmed = newBoardName.trim();
    if (!trimmed) {
      toast.error("Enter a board name.");
      return;
    }
    createMutation.mutate(trimmed);
  };

  return (
    <>
      <div className="fixed left-[110px] top-0 z-40 flex h-screen w-[220px] flex-col border-r border-border bg-muted shadow-sm">
        <div className="border-b border-border p-6">
          <h2 className="text-lg font-semibold text-foreground">Boards</h2>
          <button
            type="button"
            className="mt-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>MILESTONES</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {boards.map((board) => {
            const isSelected = displayBoardId === board.id;
            const Icon = board.icon;
            const path = `/milestones/${board.id}`;
            return (
              <Link
                key={board.id}
                to={path}
                onClick={() => setOptimisticBoardId(board.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{board.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full gap-2 rounded-lg border-dashed"
            disabled={createMutation.isPending}
            onClick={() => {
              setNewBoardName("");
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Create new board
          </Button>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new board</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="new-board-name">Board name</Label>
            <Input
              id="new-board-name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="e.g. Q3 planning"
              className="h-10"
              disabled={createMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateBoard();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              New boards start empty. Milestones you add here stay separate from other boards.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateBoard} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
