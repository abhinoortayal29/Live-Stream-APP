"use client";

import { useEffect, useState } from "react";
import { setUsername } from "@/actions/username";

export default function OnboardingPage() {
  const [username, setUsernameValue] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (username.length < 3) {
      setAvailable(null);
      return;
    }

    const delay = setTimeout(async () => {
      setChecking(true);

      const res = await fetch(
        `/api/check-username?username=${username}`
      );

      const data = await res.json();
      setAvailable(data.available);
      setChecking(false);
    }, 300);

    return () => clearTimeout(delay);
  }, [username]);

  return (
    <div className="max-w-md mx-auto py-20">
      <h1 className="text-2xl font-bold mb-4">
        Choose your unique username
      </h1>

      {/* ✅ SERVER ACTION FORM */}
      <form action={setUsername} className="flex flex-col gap-4">
        <input
          name="username"
          value={username}
          onChange={(e) =>
            setUsernameValue(e.target.value.toLowerCase())
          }
          placeholder="username"
          className="border p-2 rounded"
          required
        />

        {username.length >= 3 && (
          <p className="text-sm">
            {checking && "Checking..."}
            {!checking && available === true && (
              <span className="text-green-500">
                ✓ Username available
              </span>
            )}
            {!checking && available === false && (
              <span className="text-red-500">
                Username already taken
              </span>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={!available}
          className="bg-black text-white p-2 rounded disabled:opacity-50">
          Continue
        </button>
      </form>
    </div>
  );
}