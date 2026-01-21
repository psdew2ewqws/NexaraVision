"use client";

import React, { createContext, useContext, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface FloatingPanelContextValue {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  uniqueId: string;
  note: string;
  setNote: (note: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const FloatingPanelContext = createContext<FloatingPanelContextValue | undefined>(
  undefined
);

function useFloatingPanel() {
  const context = useContext(FloatingPanelContext);
  if (!context) {
    throw new Error(
      "useFloatingPanel must be used within a FloatingPanelRoot"
    );
  }
  return context;
}

function useFloatingPanelLogic() {
  const uniqueId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null!);

  const openPanel = () => setIsOpen(true);
  const closePanel = () => setIsOpen(false);

  return {
    isOpen,
    openPanel,
    closePanel,
    uniqueId,
    note,
    setNote,
    triggerRef,
  };
}

interface FloatingPanelRootProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanelRoot({ children, className }: FloatingPanelRootProps) {
  const floatingPanelLogic = useFloatingPanelLogic();

  return (
    <FloatingPanelContext.Provider value={floatingPanelLogic}>
      <div className={cn("relative", className)}>{children}</div>
    </FloatingPanelContext.Provider>
  );
}

interface FloatingPanelTriggerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function FloatingPanelTrigger({
  children,
  className,
  title,
}: FloatingPanelTriggerProps) {
  const { openPanel, uniqueId, triggerRef } = useFloatingPanel();

  return (
    <motion.button
      ref={triggerRef}
      layoutId={`floating-panel-trigger-${uniqueId}`}
      className={cn(
        "flex h-9 items-center border border-zinc-200 bg-white px-3 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white",
        className
      )}
      style={{ borderRadius: 8 }}
      onClick={openPanel}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-haspopup="dialog"
      aria-expanded={false}
      title={title}
    >
      <motion.span
        layoutId={`floating-panel-label-${uniqueId}`}
        className="text-sm font-semibold"
      >
        {children}
      </motion.span>
    </motion.button>
  );
}

interface FloatingPanelContentProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanelContent({
  children,
  className,
}: FloatingPanelContentProps) {
  const { isOpen, closePanel, uniqueId } = useFloatingPanel();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closePanel}
          />
          <motion.div
            ref={contentRef}
            layoutId={`floating-panel-trigger-${uniqueId}`}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 overflow-hidden border border-zinc-200 bg-white text-zinc-900 shadow-xl outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white",
              className
            )}
            style={{
              borderRadius: 12,
              x: "-50%",
              y: "-50%",
            }}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface FloatingPanelFormProps {
  children: React.ReactNode;
  onSubmit?: (note: string) => void;
  className?: string;
}

export function FloatingPanelForm({
  children,
  onSubmit,
  className,
}: FloatingPanelFormProps) {
  const { note, closePanel } = useFloatingPanel();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(note);
    closePanel();
  };

  return (
    <form className={cn("flex flex-col", className)} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}

interface FloatingPanelHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanelHeader({
  children,
  className,
}: FloatingPanelHeaderProps) {
  const { closePanel } = useFloatingPanel();

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800",
        className
      )}
    >
      <span className="font-semibold">{children}</span>
      <button
        type="button"
        onClick={closePanel}
        className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface FloatingPanelBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanelBody({
  children,
  className,
}: FloatingPanelBodyProps) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

interface FloatingPanelFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanelFooter({
  children,
  className,
}: FloatingPanelFooterProps) {
  return (
    <div
      className={cn(
        "flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  );
}

interface FloatingPanelCloseButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanelCloseButton({
  children,
  className,
}: FloatingPanelCloseButtonProps) {
  const { closePanel } = useFloatingPanel();

  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700",
        className
      )}
      onClick={closePanel}
    >
      {children}
    </button>
  );
}

interface FloatingPanelSubmitButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function FloatingPanelSubmitButton({
  children,
  className,
}: FloatingPanelSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={cn(
        "flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600",
        className
      )}
    >
      {children}
    </button>
  );
}

export {
  useFloatingPanel,
};
