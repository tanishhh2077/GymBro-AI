import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AccountRoot } from "./AccountRoot";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { registerServiceWorkerAfterLoad } from "./pwa/registerServiceWorker";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <AppErrorBoundary>
      <AccountRoot />
    </AppErrorBoundary>
  </StrictMode>,
);

registerServiceWorkerAfterLoad();
