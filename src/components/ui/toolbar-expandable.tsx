"use client";

import React, { useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToolbarItem {
  id: string;
  icon: ReactNode;
  label: string;
  panel?: ReactNode;
}

interface ToolbarExpandableProps {
  items: ToolbarItem[];
  className?: string;
  direction?: "horizontal" | "vertical";
}

const transition = {
  type: "spring" as const,
  bounce: 0.1,
  duration: 0.25,
};

export function ToolbarExpandable({
  items,
  className,
  direction = "horizontal",
}: ToolbarExpandableProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleItemClick = useCallback((id: string) => {
    setActiveItem((prev) => (prev === id ? null : id));
  }, []);

  const activePanel = items.find((item) => item.id === activeItem)?.panel;

  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center",
        className
      )}
      layout
      transition={transition}
    >
      {/* Panel Content */}
      <AnimatePresence mode="popLayout">
        {activePanel && (
          <motion.div
            key={activeItem}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={transition}
            className="mb-2 w-full"
          >
            {activePanel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <motion.div
        className={cn(
          "flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1",
          direction === "vertical" && "flex-col"
        )}
        layout
        transition={transition}
      >
        {items.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
              layout="position"
              transition={transition}
            >
              {isActive && (
                <motion.div
                  layoutId="toolbar-active-bg"
                  className="absolute inset-0 rounded-lg bg-zinc-800"
                  transition={transition}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {item.icon}
                <AnimatePresence mode="popLayout">
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={transition}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

// Settings-specific expandable toolbar
interface SettingsToolbarProps {
  className?: string;
  children: ReactNode;
}

export function SettingsToolbar({ className, children }: SettingsToolbarProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  );
}

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function SettingsSection({
  icon,
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden",
        className
      )}
      layout
      transition={transition}
    >
      {/* Header */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
        layout="position"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">{title}</h3>
            {description && (
              <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={transition}
          className="text-zinc-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
          >
            <div className="border-t border-zinc-800 p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Slider setting component
interface SliderSettingProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: "red" | "orange" | "amber" | "green" | "blue" | "purple";
  marks?: { value: number; label: string }[];
}

export function SliderSetting({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "%",
  color = "blue",
  marks,
}: SliderSettingProps) {
  const colorClasses = {
    red: "accent-red-500 text-red-400",
    orange: "accent-orange-500 text-orange-400",
    amber: "accent-amber-500 text-amber-400",
    green: "accent-green-500 text-green-400",
    blue: "accent-blue-500 text-blue-400",
    purple: "accent-purple-500 text-purple-400",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
        <span className={cn("text-lg font-bold font-mono", colorClasses[color].split(" ")[1])}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer",
          colorClasses[color].split(" ")[0]
        )}
      />
      {marks && (
        <div className="flex justify-between text-xs text-zinc-500">
          {marks.map((mark) => (
            <span key={mark.value}>{mark.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Number input setting component
interface NumberSettingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
}

export function NumberSetting({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: NumberSettingProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-zinc-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
        {unit && <span className="text-zinc-400 text-sm">{unit}</span>}
      </div>
    </div>
  );
}

// Toggle setting component
interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-blue-500" : "bg-zinc-700"
        )}
      >
        <motion.div
          className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white"
          animate={{ x: checked ? 20 : 0 }}
          transition={transition}
        />
      </button>
    </div>
  );
}

// Summary box component
interface SummaryBoxProps {
  title: string;
  items: { label: string; value: string; color?: string }[];
}

export function SummaryBox({ title, items }: SummaryBoxProps) {
  return (
    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
      <p className="text-xs font-medium text-zinc-400 mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between">
            <span className="text-zinc-500">{item.label}:</span>
            <span className={cn("font-mono", item.color || "text-zinc-300")}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
