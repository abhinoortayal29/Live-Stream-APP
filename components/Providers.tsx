// components/Providers.tsx
'use client';

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ThemeProvider } from "@/components/theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{ theme: dark }}
    >
      <ThemeProvider attribute="class" forcedTheme="dark" storageKey="gamehub-theme">
        {children}
      </ThemeProvider>
    </ClerkProvider>
  );
}