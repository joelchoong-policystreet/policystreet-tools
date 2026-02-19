import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TableSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function TableSearch({ value, onChange, placeholder = "Search…" }: TableSearchProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-52"
      />
      <Button variant="outline" size="sm" className="shrink-0">
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </div>
  );
}
