import { Button } from "@/components/ui/button";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { getSelf } from "@/lib/auth-service";

export const Actions = async () => {
  const user = await currentUser();

  // Get user from YOUR database
  const dbUser = user ? await getSelf() : null;

  return (
    <div className="flex items-center gap-x-3">
      {!user ? (
        <SignInButton>
          <Button size="sm" variant="primary">
            Login
          </Button>
        </SignInButton>
      ) : (
        <div className="flex items-center gap-x-3">
          {dbUser && (
            <Link href={`/u/${dbUser.username}`}>
              <Button variant="secondary" className="flex items-center gap-x-2">
                <Clapperboard className="h-5 w-5" />
                <span className="hidden lg:block">Dashboard</span>
              </Button>
            </Link>
          )}
          <UserButton />
        </div>
      )}
    </div>
  );
};