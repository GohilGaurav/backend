import Router from "express";
import {
  getChannelStats,
  getChannelVideos,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/channel-stats/:channelID").get(getChannelStats);
getChannelVideos;
router.route("/channel-videos/:channelID").get(getChannelVideos);

export default router;
