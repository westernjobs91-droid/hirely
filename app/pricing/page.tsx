"use client";
// app/pricing/page.tsx

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    id: "solo",
    name: "Solo",
    price: 19,
    description: "Perfect for individual recruiters",
    features: [
      "Up to 200 contacts",
      "LinkedIn Chrome extension",
      "Email enrichment",
      "AI follow-up drafts",
      "Pipeline kanban board",
      "Outlook add-in",
    ],
    color: "border-gray-200",
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: 39,
    description: "For serious recruiters",
    features: [
      "Unlimited contacts",
      "Everything in Solo",
      "Priority email enrichment",
      "Advanced AI drafts",
      "Activity timeline",
      "CSV export",
    ],
    color: "border-blue-600",
    badge: "Most Popular",
  },
  {
    id: "agency",
    name: "Agency",
    price: 99,
    description: "For recruiting teams",
    features: [
      "5 seats included",
      "Everything in Pro",
      "Team pipeline view",
      "Shared contact management",
      "Team activity feed",
      "Priority support",
    ],
    color: "border-gray-200",
    badge: null,
  },
];

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();


  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data } = await supabase
        .from("profiles")
        .select("plan, plan_status")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
    load();
  }, []);

  async function handleUpgrade(planId: string) {
    if (!user) return;
    setLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ plan: planId }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: any) {
      alert("Something went wrong: " + err.message);
      setLoading(null);
    }
  }

  async function handleManage() {
    if (!user) return;
    setLoading("portal");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({}),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: any) {
      alert("Something went wrong: " + err.message);
      setLoading(null);
    }
  }

  const currentPlan = profile?.plan_status === "active" ? profile?.plan : null;

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-500">
            Place more. Follow up smarter.
          </p>
          {currentPlan && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              You&apos;re on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan
              <button
                onClick={handleManage}
                disabled={loading === "portal"}
                className="ml-2 underline text-green-600 hover:text-green-800"
              >
                {loading === "portal" ? "Loading..." : "Manage"}
              </button>
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isPopular = plan.badge === "Most Popular";

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 ${plan.color} p-8 flex flex-col ${
                  isPopular ? "shadow-xl scale-105" : "shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    onClick={handleManage}
                    disabled={loading === "portal"}
                    className="w-full py-3 rounded-xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition"
                  >
                    {loading === "portal" ? "Loading..." : "Current Plan - Manage"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!loading}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                      isPopular
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === plan.id ? "Redirecting..." : `Get ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 mt-10">
          All plans include a 7-day free trial. Cancel anytime. Prices in USD.
        </p>

        {/* Back to dashboard */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            ← Back to dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
