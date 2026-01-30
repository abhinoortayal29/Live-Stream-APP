"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // SIZE & LAYOUT
        "peer inline-flex h-5 w-10 shrink-0 items-center rounded-full",

        // BORDER for visibility
        "border border-border",

        // BACKGROUND COLORS
        "bg-muted data-[state=checked]:bg-emerald-500",
        "dark:bg-zinc-700 dark:data-[state=checked]:bg-emerald-500",

        // INTERACTION
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",

        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // THUMB SIZE
          "block h-4 w-4 rounded-full",

          // THUMB COLORS
          "bg-white dark:bg-white",

          // MOVEMENT
          "translate-x-0 data-[state=checked]:translate-x-5",

          // SMOOTH
          "transition-transform"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
