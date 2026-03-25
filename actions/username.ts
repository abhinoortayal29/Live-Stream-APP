"use server";

import { db } from "@/lib/db";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const REGEX = /^[a-zA-Z0-9_]+$/;

export async function setUsername(formData: FormData) {
  const clerkUser = await currentUser();
  if (!clerkUser) return;

  if (clerkUser.username) {
    redirect("/");
  }

  const username = (formData.get("username") as string)
    ?.trim()
    .toLowerCase();

  if (!username || username.length < 3 || !REGEX.test(username)) return;

  const existing = await db.user.findUnique({
    where: { username },
  });

  if (existing) return;

  await db.user.upsert({
    where: { externalUserId: clerkUser.id },
    update: { username },
    create: {
      externalUserId: clerkUser.id,
      username,
      imageUrl: clerkUser.imageUrl ?? "",
      bio: "",
    },
  });

  // ⭐ FIX HERE
  const client = await clerkClient();

  await client.users.updateUser(clerkUser.id, {
    username,
  });

  redirect("/");
}