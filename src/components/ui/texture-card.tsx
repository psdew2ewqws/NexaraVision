"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TextureCardStyled = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative overflow-hidden rounded-2xl",
      "bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90",
      "border border-white/10",
      "shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_8px_40px_-12px_rgba(0,0,0,0.7)]",
      "backdrop-blur-xl",
      className
    )}
    {...props}
  />
));
TextureCardStyled.displayName = "TextureCardStyled";

const TextureCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
TextureCardHeader.displayName = "TextureCardHeader";

const TextureCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold tracking-tight text-white",
      className
    )}
    {...props}
  />
));
TextureCardTitle.displayName = "TextureCardTitle";

const TextureCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-400", className)}
    {...props}
  />
));
TextureCardDescription.displayName = "TextureCardDescription";

const TextureCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
TextureCardContent.displayName = "TextureCardContent";

const TextureCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
TextureCardFooter.displayName = "TextureCardFooter";

const TextureSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent",
      className
    )}
    {...props}
  />
));
TextureSeparator.displayName = "TextureSeparator";

export {
  TextureCardStyled,
  TextureCardHeader,
  TextureCardTitle,
  TextureCardDescription,
  TextureCardContent,
  TextureCardFooter,
  TextureSeparator,
};
