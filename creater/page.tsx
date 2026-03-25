import { getSelf } from "@/lib/auth-service";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export default async function CreatorPage() {
  const self = await getSelf();

  if (!self) redirect("/sign-in");
  if (!self.username) redirect("/setup-username");

  if (!self.stream) {
    await db.stream.create({
      data: {
        userId: self.id,
        name: `${self.username}'s stream`,
      },
    });
  }

  return <div>Creator dashboard</div>;
}