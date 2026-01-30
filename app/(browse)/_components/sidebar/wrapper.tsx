"use client";
import { useState,useEffect } from "react";
import { useSidebar } from "@/store/use-sidebar";
import { cn } from "@/lib/utils";
import { ToggleSkelton } from "./toggle";
import { RecommendedSkelton } from "./recommended";
import { FollowingSkeleton } from "./following";
interface WrapperProps {
  children: React.ReactNode;
}

export const Wrapper = ({ children }: WrapperProps) => {

  const [isClient,setIsclient ]=useState(false);
  const { collapsed } = useSidebar((s) => s);

  useEffect(()=>{
    setIsclient(true);
  },[])
  if (! isClient)
  return (
    <aside className="fixed left-0 top-16 h-[calc(100%-4rem)] w-[240px] bg-background border-r border-[#2D2E35] z-40 flex flex-col">
      <ToggleSkelton />
      <FollowingSkeleton/>
      <RecommendedSkelton />
    </aside>
  );


  return (
    <aside
      className={cn(
        // sidebar starts BELOW navbar:
        "fixed left-0 top-16 h-[calc(100%-4rem)] bg-background border-r border-[#2D2E35] z-40 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
        collapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      {children}
    </aside>
  );
};
