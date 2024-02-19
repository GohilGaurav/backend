import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTweet,
  updateTweet,
  deleteTweet,
  getUserTweets,
  getTweetByID,
  getMyTweets,
} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getMyTweets).post(createTweet);
router.route("/user/:userID").get(getUserTweets);

router
  .route("/:tweetID")
  .get(getTweetByID)
  .delete(deleteTweet)
  .patch(updateTweet);

export default router;
