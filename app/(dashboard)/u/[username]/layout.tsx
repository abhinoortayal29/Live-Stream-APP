import React from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSelfByUsername } from "@/lib/auth-service";
import { Navbar } from "./_components/navbar";
import { Sidebar } from "./_components/sidebar";
import { Container } from "./_components/continer";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function CreatorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  try {
    await getSelfByUsername(username);
  } catch {
    redirect("/");
  }

  return (
    <>
      <Navbar />

      <div className="flex h-full pt-20">
        <Sidebar />
        <Container>{children}</Container>
      </div>
    </>
  );
}
