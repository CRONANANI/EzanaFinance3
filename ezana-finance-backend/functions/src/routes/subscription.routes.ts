import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import stripeService from "../services/stripe.service";

const router = Router();

router.get("/plans", (_req, res) => {
  res.json(stripeService.getPlans());
});

router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const { planId, billing = "monthly" } = req.body;
    if (!planId) {
      res.status(400).json({ error: "planId required" });
      return;
    }
    const session = await stripeService.createCheckoutSession(
      authReq.user!.uid,
      planId,
      billing
    );
    res.json(session);
  } catch (error: any) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: error.message || "Checkout failed" });
  }
});

router.post("/portal", authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) {
      res.status(400).json({ error: "customerId required" });
      return;
    }
    const session = await stripeService.createBillingPortalSession(customerId);
    res.json(session);
  } catch (error: any) {
    console.error("Portal error:", error);
    res.status(500).json({ error: error.message || "Portal creation failed" });
  }
});

export default router;
