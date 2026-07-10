// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TrVW7JYp8fgJBx4sWJvf14I": "solo",
  "price_1TrVWtJYp8fgJBx4CqOBQ531": "pro",
  "price_1TrVXJJYp8fgJBx40JdmO7gK": "agency",
};

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia" as any,
  });

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        await supabase.from("profiles").upsert({
          id: userId,
          plan,
          plan_status: "active",
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      const userId = sub.metadata?.userId;
      const priceId = sub.items?.data[0]?.price?.id;
      const plan = PRICE_TO_PLAN[priceId] || "solo";
      const status = sub.status === "active" ? "active" : "inactive";
      if (userId) {
        await supabase.from("profiles").upsert({
          id: userId, plan, plan_status: status,
          stripe_subscription_id: sub.id,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      const userId = sub.metadata?.userId;
      if (userId) {
        await supabase.from("profiles").upsert({
          id: userId, plan: "free", plan_status: "inactive",
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
