import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import { auth } from "../config/firebase";

const router = Router();

router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userRecord = await auth.getUser(req.user.uid);
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
