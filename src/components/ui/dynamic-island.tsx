"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion, Transition, TargetAndTransition } from "framer-motion";
import { cn } from "@/lib/utils";

type DynamicIslandSize =
  | "compact"
  | "minimalLeading"
  | "minimalTrailing"
  | "default"
  | "long"
  | "large"
  | "tall"
  | "medium"
  | "ultra";

type BlobState = {
  size: DynamicIslandSize;
  previousSize: DynamicIslandSize | undefined;
  animationQueue: DynamicIslandSize[];
  isAnimating: boolean;
};

type BlobStateContextType = {
  state: BlobState;
  setSize: (size: DynamicIslandSize) => void;
  scheduleAnimation: (sizes: DynamicIslandSize[], delay: number) => void;
  presets: {
    [key in DynamicIslandSize]: {
      width: number;
      height: number;
      aspectRatio: number;
      borderRadius: number;
    };
  };
};

const DynamicIslandSizePresets: BlobStateContextType["presets"] = {
  compact: {
    width: 120,
    height: 36,
    aspectRatio: 44 / 36,
    borderRadius: 22,
  },
  minimalLeading: {
    width: 52.33,
    height: 36,
    aspectRatio: 52.33 / 36,
    borderRadius: 22,
  },
  minimalTrailing: {
    width: 52.33,
    height: 36,
    aspectRatio: 52.33 / 36,
    borderRadius: 22,
  },
  default: {
    width: 150,
    height: 36,
    aspectRatio: 150 / 36,
    borderRadius: 22,
  },
  long: {
    width: 350,
    height: 44,
    aspectRatio: 350 / 44,
    borderRadius: 22,
  },
  large: {
    width: 371,
    height: 84,
    aspectRatio: 371 / 84,
    borderRadius: 42,
  },
  tall: {
    width: 371,
    height: 210,
    aspectRatio: 371 / 210,
    borderRadius: 42,
  },
  medium: {
    width: 371,
    height: 140,
    aspectRatio: 371 / 140,
    borderRadius: 36,
  },
  ultra: {
    width: 371,
    height: 300,
    aspectRatio: 371 / 300,
    borderRadius: 42,
  },
};

const DynamicIslandContext = createContext<BlobStateContextType | null>(null);

const stiffness = 400;
const damping = 30;
const MIN_DISTANCE = 10;

const calculateDynamicVariants = (
  size: DynamicIslandSize,
  previousSize: DynamicIslandSize | undefined
): { animate: TargetAndTransition; initial?: TargetAndTransition } => {
  const preset = DynamicIslandSizePresets[size];
  const previousPreset = previousSize
    ? DynamicIslandSizePresets[previousSize]
    : preset;

  const widthDifference = Math.abs(preset.width - previousPreset.width);
  const isSizeIncreasing = preset.width > previousPreset.width;

  const createTransition = (
    additionalDelay: number = 0
  ): Transition => ({
    type: "spring",
    stiffness,
    damping,
    delay: additionalDelay,
  });

  const baseVariant = {
    width: preset.width,
    height: preset.height,
    borderRadius: preset.borderRadius,
    transition: createTransition(),
  };

  if (widthDifference <= MIN_DISTANCE) {
    return { animate: baseVariant };
  }

  const zoomTransition = createTransition(isSizeIncreasing ? 0.25 : 0);

  return {
    animate: {
      ...baseVariant,
      transition: zoomTransition,
      scale: 1,
    },
    initial: {
      scale: isSizeIncreasing ? 1.15 : 0.9,
    },
  };
};

const DynamicIslandContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { state, presets } = useDynamicIslandSize();
  const preset = presets[state.size];
  const previousPreset = state.previousSize
    ? presets[state.previousSize]
    : preset;

  const variants = calculateDynamicVariants(state.size, state.previousSize);

  return (
    <motion.div
      className={cn(
        "mx-auto flex items-center justify-center overflow-hidden bg-black text-white",
        className
      )}
      initial={{
        width: previousPreset?.width ?? preset.width,
        height: previousPreset?.height ?? preset.height,
        borderRadius: previousPreset?.borderRadius ?? preset.borderRadius,
        ...variants.initial,
      }}
      animate={variants.animate}
      style={{
        willChange: "transform, width, height, border-radius",
      }}
    >
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </motion.div>
  );
};

const DynamicContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      className={cn("flex w-full flex-row items-center justify-between", className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: stiffness,
        damping: damping,
      }}
    >
      {children}
    </motion.div>
  );
};

const DynamicDiv = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ type: "spring", stiffness, damping }}
    >
      {children}
    </motion.div>
  );
};

const DynamicTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.h3
      className={cn("my-1 font-semibold text-white", className)}
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ type: "spring", stiffness, damping }}
    >
      {children}
    </motion.h3>
  );
};

const DynamicDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.p
      className={cn("text-neutral-400 text-sm", className)}
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(10px)" }}
      transition={{ type: "spring", stiffness, damping }}
    >
      {children}
    </motion.p>
  );
};

function DynamicIslandProvider({
  children,
  initialSize = "default",
}: {
  children: React.ReactNode;
  initialSize?: DynamicIslandSize;
}) {
  const [state, setState] = useState<BlobState>({
    size: initialSize,
    previousSize: undefined,
    animationQueue: [],
    isAnimating: false,
  });

  const setSize = useCallback((newSize: DynamicIslandSize) => {
    setState((prev) => ({
      ...prev,
      previousSize: prev.size,
      size: newSize,
    }));
  }, []);

  const scheduleAnimation = useCallback(
    (sizes: DynamicIslandSize[], delay: number) => {
      setState((prev) => ({
        ...prev,
        animationQueue: sizes,
      }));

      sizes.forEach((size, index) => {
        setTimeout(
          () => {
            setSize(size);
          },
          delay * (index + 1)
        );
      });
    },
    [setSize]
  );

  const contextValue = useMemo(
    () => ({
      state,
      setSize,
      scheduleAnimation,
      presets: DynamicIslandSizePresets,
    }),
    [state, setSize, scheduleAnimation]
  );

  return (
    <DynamicIslandContext.Provider value={contextValue}>
      {children}
    </DynamicIslandContext.Provider>
  );
}

function useDynamicIslandSize(): BlobStateContextType {
  const context = useContext(DynamicIslandContext);
  if (!context) {
    throw new Error(
      "useDynamicIslandSize must be used within a DynamicIslandProvider"
    );
  }
  return context;
}

function useScheduledAnimations(
  animations: DynamicIslandSize[],
  delay: number = 2000
) {
  const { scheduleAnimation } = useDynamicIslandSize();

  useEffect(() => {
    scheduleAnimation(animations, delay);
  }, [animations, delay, scheduleAnimation]);
}

const DynamicIsland = ({
  children,
  id,
  className,
}: {
  children: React.ReactNode;
  id: string;
  className?: string;
}) => {
  return (
    <DynamicIslandContainer className={className}>
      <motion.div
        key={id}
        className="w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness, damping }}
      >
        {children}
      </motion.div>
    </DynamicIslandContainer>
  );
};

export {
  DynamicIsland,
  DynamicIslandProvider,
  DynamicContainer,
  DynamicDescription,
  DynamicDiv,
  DynamicTitle,
  useDynamicIslandSize,
  useScheduledAnimations,
  DynamicIslandSizePresets,
  type DynamicIslandSize,
};
