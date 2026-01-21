"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariantsOuter = cva(
  "relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-slate-700 to-slate-900 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_4px_12px_-2px_rgba(0,0,0,0.4)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_6px_16px_-4px_rgba(0,0,0,0.5)] active:scale-[0.98]",
        accent:
          "bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_4px_12px_-2px_rgba(59,130,246,0.5)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_6px_20px_-4px_rgba(59,130,246,0.6)] active:scale-[0.98]",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-700 shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_4px_12px_-2px_rgba(239,68,68,0.5)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_6px_20px_-4px_rgba(239,68,68,0.6)] active:scale-[0.98]",
        success:
          "bg-gradient-to-b from-green-500 to-green-700 shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_4px_12px_-2px_rgba(34,197,94,0.5)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_6px_20px_-4px_rgba(34,197,94,0.6)] active:scale-[0.98]",
        warning:
          "bg-gradient-to-b from-orange-500 to-orange-700 shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_4px_12px_-2px_rgba(249,115,22,0.5)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_6px_20px_-4px_rgba(249,115,22,0.6)] active:scale-[0.98]",
        secondary:
          "bg-gradient-to-b from-slate-600 to-slate-800 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_-1px_0_0_rgba(0,0,0,0.3)_inset,0_4px_12px_-4px_rgba(0,0,0,0.4)] active:scale-[0.98]",
        ghost:
          "bg-transparent hover:bg-white/5 active:bg-white/10",
        outline:
          "border border-white/20 bg-transparent hover:bg-white/5 active:bg-white/10",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

const innerDivVariants = cva(
  "flex items-center justify-center gap-2 text-white",
  {
    variants: {
      variant: {
        primary: "",
        accent: "",
        destructive: "",
        success: "",
        warning: "",
        secondary: "text-slate-200",
        ghost: "text-slate-300",
        outline: "text-slate-300",
      },
      size: {
        sm: "",
        default: "",
        lg: "",
        xl: "",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface TextureButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariantsOuter> {
  asChild?: boolean;
}

const TextureButton = React.forwardRef<HTMLButtonElement, TextureButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariantsOuter({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <div className={cn(innerDivVariants({ variant, size }))}>
          {children}
        </div>
      </Comp>
    );
  }
);
TextureButton.displayName = "TextureButton";

export { TextureButton, buttonVariantsOuter };
