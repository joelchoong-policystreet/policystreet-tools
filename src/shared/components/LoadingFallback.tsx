import { Loader2 } from "lucide-react";

export function LoadingFallback() {
    return (
        <div className="w-full h-[50vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading application data...</p>
        </div>
    );
}
