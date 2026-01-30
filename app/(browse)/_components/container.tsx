"use client";
import { useEffect } from "react";
import { useMediaQuery } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store/use-sidebar";

interface ContainerProps {
  children: React.ReactNode;
}

export const Container = ({ children }: ContainerProps) => {
      //check size of screen auto collapse if in mobile mode 
  const matches = useMediaQuery("(max-width:1024px)");
  const { collapsed, onCollapse, onExpand } = useSidebar((s) => s);

  useEffect(() => {
    if (matches) onCollapse();
    else onExpand();
  }, [matches, onCollapse, onExpand]);

  return (
    <main
      className={cn(
        "transition-all duration-300 ease-in-out min-h-screen w-full pt-16 bg-[#1a1b20]", // pt-16 ensures content starts below navbar
        collapsed ? "ml-[70px]" : "ml-[240px]"
      )}
    >
      {children}
    </main>
  );
};
