import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  wide = false,
  testId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  testId?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className={`my-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-lg bg-white shadow-xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} testId="confirm-dialog">
      <p className="text-sm text-slate-700">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white" onClick={onConfirm} data-testid="confirm-action">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
