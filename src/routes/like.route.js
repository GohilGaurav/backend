import Router from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos,
} from "../controllers/like.controller.js";

const router = Router();
router.use(verifyJWT);
router.route("/").get(getLikedVideos);
router.route("/video/:videoID").post(toggleVideoLike);
router.route("/tweet/:tweetID").post(toggleTweetLike);
router.route("/comment/:commentID").post(toggleCommentLike);

export default router;
