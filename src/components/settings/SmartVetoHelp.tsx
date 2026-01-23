"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined);

function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error("usePopover must be used within a PopoverRoot");
  }
  return context;
}

interface PopoverRootProps {
  children: React.ReactNode;
}

function PopoverRoot({ children }: PopoverRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <PopoverContext.Provider value={{ isOpen, open, close, toggle }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  className?: string;
}

function PopoverTrigger({ children, className }: PopoverTriggerProps) {
  const { toggle } = usePopover();

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center",
        "h-8 px-3 text-xs font-medium tracking-wide uppercase",
        "bg-black text-zinc-400 border border-zinc-800",
        "hover:text-white hover:border-zinc-600",
        "transition-all duration-200",
        className
      )}
    >
      {children}
    </button>
  );
}

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}

function PopoverContent({ children, className, align = "end" }: PopoverContentProps) {
  const { isOpen, close } = usePopover();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        close();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  const alignmentClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "absolute top-full mt-2 z-50",
            "bg-black border border-zinc-800",
            "shadow-2xl shadow-black/50",
            alignmentClasses[align],
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PopoverHeaderProps {
  children: React.ReactNode;
  className?: string;
}

function PopoverHeader({ children, className }: PopoverHeaderProps) {
  return (
    <div className={cn("px-5 py-4 border-b border-zinc-800", className)}>
      {children}
    </div>
  );
}

interface PopoverBodyProps {
  children: React.ReactNode;
  className?: string;
}

function PopoverBody({ children, className }: PopoverBodyProps) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

interface PopoverCloseButtonProps {
  children?: React.ReactNode;
  className?: string;
}

function PopoverCloseButton({ children, className }: PopoverCloseButtonProps) {
  const { close } = usePopover();

  return (
    <button
      type="button"
      onClick={close}
      className={cn(
        "text-xs font-medium tracking-wide uppercase",
        "text-zinc-500 hover:text-white",
        "transition-colors duration-200",
        className
      )}
    >
      {children || "Close"}
    </button>
  );
}

// Smart Veto Help Component
interface SmartVetoHelpProps {
  locale?: "en" | "ar";
  isRTL?: boolean;
}

const content = {
  en: {
    trigger: "How it works",
    title: "SMART VETO ENSEMBLE",
    subtitle: "Dual-model violence detection system",
    sections: [
      {
        label: "PRIMARY MODEL",
        description: "Analyzes skeletal pose sequences using temporal graph neural networks. Flags potential violence when confidence exceeds threshold.",
      },
      {
        label: "VETO MODEL",
        description: "Secondary validation layer. If VETO confidence is below threshold, overrides PRIMARY to SAFE status, reducing false positives.",
      },
      {
        label: "ENSEMBLE LOGIC",
        description: "VIOLENCE = PRIMARY ≥ threshold AND VETO ≥ threshold. Both models must agree for final classification.",
      },
    ],
    metrics: {
      title: "PERFORMANCE",
      items: [
        { label: "Accuracy", value: "94.7%" },
        { label: "Latency", value: "<100ms" },
        { label: "F1 Score", value: "0.92" },
      ],
    },
    close: "Close",
  },
  ar: {
    trigger: "كيف يعمل",
    title: "مجموعة الفيتو الذكية",
    subtitle: "نظام كشف العنف ثنائي النموذج",
    sections: [
      {
        label: "النموذج الأساسي",
        description: "يحلل تسلسلات وضعية الهيكل العظمي باستخدام شبكات الرسم البياني الزمنية. يشير إلى العنف المحتمل عندما تتجاوز الثقة الحد.",
      },
      {
        label: "نموذج الفيتو",
        description: "طبقة التحقق الثانوية. إذا كانت ثقة الفيتو أقل من الحد، يتجاوز الأساسي إلى حالة آمنة، مما يقلل الإيجابيات الكاذبة.",
      },
      {
        label: "منطق المجموعة",
        description: "العنف = الأساسي ≥ الحد و الفيتو ≥ الحد. يجب أن يتفق كلا النموذجين للتصنيف النهائي.",
      },
    ],
    metrics: {
      title: "الأداء",
      items: [
        { label: "الدقة", value: "94.7%" },
        { label: "زمن الاستجابة", value: "<100ms" },
        { label: "درجة F1", value: "0.92" },
      ],
    },
    close: "إغلاق",
  },
};

export function SmartVetoHelp({ locale = "en", isRTL = false }: SmartVetoHelpProps) {
  const t = content[locale];

  return (
    <PopoverRoot>
      <PopoverTrigger className="rounded-none">
        {t.trigger}
      </PopoverTrigger>
      <PopoverContent className={cn("w-80 sm:w-96", isRTL && "text-right")} align={isRTL ? "start" : "end"}>
        <PopoverHeader>
          <h3 className="text-sm font-bold tracking-wider text-white uppercase">
            {t.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">{t.subtitle}</p>
        </PopoverHeader>

        <PopoverBody className="space-y-4">
          {t.sections.map((section, index) => (
            <div key={index} className="space-y-1">
              <div className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                {section.label}
              </div>
              <p className="text-xs leading-relaxed text-zinc-300">
                {section.description}
              </p>
            </div>
          ))}

          <div className="pt-3 border-t border-zinc-800">
            <div className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-3">
              {t.metrics.title}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {t.metrics.items.map((metric, index) => (
                <div key={index} className="text-center">
                  <div className="text-lg font-bold text-white tabular-nums">
                    {metric.value}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <PopoverCloseButton>{t.close}</PopoverCloseButton>
          </div>
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  );
}

export {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
};
