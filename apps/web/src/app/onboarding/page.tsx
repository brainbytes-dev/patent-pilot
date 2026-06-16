"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IndustryStep } from "./_components/industry-step";
import { KeywordsStep } from "./_components/keywords-step";
import { ConfirmStep } from "./_components/confirm-step";
import { Progress } from "@/components/ui/progress";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [industries, setIndustries] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industries, keywords, cpcCodes: [] }),
      });
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-lg font-semibold text-foreground">Patent Pilot</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Patent Pilot einrichten
          </h1>
          <p className="text-muted-foreground mt-1">Schritt {step} von 3</p>
          <Progress value={(step / 3) * 100} className="mt-3" />
        </div>
        {step === 1 && (
          <IndustryStep
            selected={industries}
            onChange={setIndustries}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <KeywordsStep
            keywords={keywords}
            industries={industries}
            onChange={setKeywords}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            industries={industries}
            keywords={keywords}
            onBack={() => setStep(2)}
            onFinish={handleFinish}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
