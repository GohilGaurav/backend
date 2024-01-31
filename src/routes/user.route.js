import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateUserPassword,
  updateUserInfo,
  updateUserAvatar,
  updateUserCoverImage,
  getCurrentUser,
  getChannelProfile,
  getUserWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

//Secured routes

router.route("/logout").post(verifyJWT, logoutUser);
router.route("/update-password").post(verifyJWT, updateUserPassword);
router.route("/update-user-info").post(verifyJWT, updateUserInfo);
router
  .route("/update-avatar")
  .post(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/update-coverimage")
  .post(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/getcurrentuser").get(verifyJWT, getCurrentUser);
router.route("/channel/:username").get(verifyJWT, getChannelProfile);
router.route("/watch-history").get(verifyJWT, getUserWatchHistory);

export default router;
