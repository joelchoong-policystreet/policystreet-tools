import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { GlobalErrorBoundary } from "@/features/layout/presentation/GlobalErrorBoundary";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary FallbackComponent={GlobalErrorBoundary}>
        <App />
    </ErrorBoundary>
);
