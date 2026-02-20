import { FallbackProps } from "react-error-boundary";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalErrorBoundary({ error, resetErrorBoundary }: FallbackProps) {
    const err = error as Error;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full space-y-6">
                <div className="mx-auto w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
                    <p className="text-muted-foreground">
                        An unexpected error occurred in the application. The error has been logged.
                    </p>
                </div>

                {err?.message && (
                    <div className="bg-muted p-4 rounded-lg text-left overflow-auto max-h-[300px]">
                        <p className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                            {err.message}
                        </p>
                        {err.stack && (
                            <p className="text-xs font-mono text-muted-foreground/70 mt-2 whitespace-pre-wrap">
                                {err.stack}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <Button onClick={resetErrorBoundary} className="gap-2">
                        <RefreshCcw className="w-4 h-4" />
                        Try again
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-2">
                        <Home className="w-4 h-4" />
                        Return Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
