/** @format */

import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const toastStyles = {
  success: {
    bg: "bg-emerald-600",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  error: {
    bg: "bg-red-600",
    icon: <XCircle className="w-5 h-5" />,
  },
  warning: {
    bg: "bg-orange-500",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  info: {
    bg: "bg-slate-800", // 🔥 HRMS sidebar match
    icon: <Info className="w-5 h-5" />,
  },
};

function ToastUI({
  type = "info",
  title,
  message,
  duration = 3000,
  onClose,
}: ToastOptions & { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const style = toastStyles[type];

  return (
    <div className="fixed top-5 right-5 z-[9999]">
      <div
        className={`flex items-start gap-3 text-white px-4 py-3 rounded-xl
        shadow-xl border border-white/10 backdrop-blur-md
        animate-slideInRight ${style.bg}`}
      >
        {style.icon}

        <div className="flex-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          {message && <p className="text-xs opacity-90 mt-0.5">{message}</p>}
        </div>

        <button onClick={onClose}>
          <X className="w-4 h-4 opacity-80 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}

/* ===============================
   🔥 GLOBAL TOAST FUNCTION
   =============================== */

export function toast(options: ToastOptions) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  const close = () => {
    root.unmount();
    container.remove();
  };

  root.render(<ToastUI {...options} onClose={close} />);
}
