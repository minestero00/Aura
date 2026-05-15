import Stripe from "stripe";
import { config } from "../../config/env.js";

let client: Stripe | null = null;
let warnLogged = false;

export function getStripe(): Stripe | null {
  if (client) return client;
  if (!config.stripeSecretKey) {
    if (!warnLogged) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-back",
          module: "subscription/stripe",
          message: "STRIPE_SECRET_KEY not set — Stripe APIs are no-op stubs"
        })
      );
      warnLogged = true;
    }
    return null;
  }
  client = new Stripe(config.stripeSecretKey);
  return client;
}

export function constructStripeEvent(
  rawBody: Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripe();
  if (!stripe || !config.stripeWebhookSecret) return null;
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  } catch {
    return null;
  }
}
