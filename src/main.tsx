import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ToastProvider } from "./components/Toast";
import { STORAGE_KEY } from "./lib/storage";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "Unknown error" };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <main className="mx-auto max-w-lg p-8 text-slate-900">
        <h1 className="text-xl font-semibold">The dashboard hit an error</h1>
        <p className="mt-2 text-sm text-slate-600">{this.state.message}</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white"
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }}
        >
          Reset to sample data
        </button>
      </main>
    );
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
