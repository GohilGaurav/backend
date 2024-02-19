import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannel,
} from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJWT);
router.route("/toggle-subscription/:channelID").post(toggleSubscription);
router.route("/:channelID").get(getUserChannelSubscribers);
router.route("/").get(getSubscribedChannel);

export default router;
