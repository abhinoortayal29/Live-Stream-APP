import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Results, ResultsSkeleton } from "./_components/results";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const params = await searchParams;

  if (!params.term) redirect("/");

  return (
    <div className="h-full p-8 max-w-screen-2xl mx-auto">
      <Suspense fallback={<ResultsSkeleton />}>
        <Results term={params.term} />
      </Suspense>
    </div>
  );
}