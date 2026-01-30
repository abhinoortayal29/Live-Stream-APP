"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Switch } from "@/components/ui/switch";
import { updateStream } from "@/actions/stream";
import { Skeleton } from "@/components/ui/skeleton";

type FieldTypes =
  | "isChatEnabled"
  | "isChatDelayed"
  | "isChatFollowersOnly";

export function ToggleCard({
  field,
  label,
  value,
}: {
  field: FieldTypes;
  label: string;
  value: boolean;
}) {
  const [checked, setChecked] = useState(value);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onChange = (next: boolean) => {
    setChecked(next); // ✅ UI updates instantly

    startTransition(() => {
      updateStream({ [field]: next })
        .then(() => {
          toast.success("Chat settings updated");
          
        })
        .catch(() => {
          setChecked(!next); // rollback
          toast.error("Failed to update chat settings");
        });
    });
  };

  return (
    <div className="rounded-xl bg-muted p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold shrink-0">{label}</p>

        <div className="flex items-center gap-2">
          <Switch
            checked={checked}
            disabled={isPending}
            onCheckedChange={onChange}
          />
          <span className="text-sm text-muted-foreground">
            {checked ? "On" : "Off"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ToggleCardSkeleton() {
  return <Skeleton className="rounded-xl p-10 w-full" />;
}
