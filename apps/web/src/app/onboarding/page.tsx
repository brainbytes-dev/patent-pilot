"use client";

import { useRouter } from "next/navigation";
import { WatchlistModal } from "@/components/watchlist-modal";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <WatchlistModal
        open={true}
        onClose={() => router.push("/dashboard")}
        onSuccess={() => router.push("/dashboard")}
      />
    </div>
  );
}
