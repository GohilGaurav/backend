import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

const generateAcessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  // get the data from User
  // validate data
  // check if the user already exist
  // check if the image is provided
  // upload the image to local
  // upload image to cloudinary
  // create the user
  // check if user is created
  // if user is created reutn the user

  const { username, email, password, fullName } = req.body;

  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUsername = await User.findOne({ username });
  if (existedUsername) throw new ApiError(409, "Username already exists");

  const existedEmail = await User.findOne({ email });
  if (existedEmail) throw new ApiError(409, "Email already exists");

  let avatarLocalPath, coverImageLocalPath, avatar, coverImage;

  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
    avatar = await uploadOnCloudinary(avatarLocalPath);
  }

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  if (!avatarLocalPath) throw new ApiError(401, "Avatar file is required");

  if (!avatar) throw new ApiError(401, "Avatar file is required");

  const user = await User.create({
    username,
    email,
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(401, "Something went wrong while registering the user");

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username && !email) {
      throw new ApiError(404, "username or email is required");
    }

    if (!password) {
      throw new ApiError(404, "Password is required");
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const passwordCorrect = await user.isPasswordCorrect(password);

    if (!passwordCorrect) {
      throw new ApiError(401, "Inavlid credentials");
    }

    const { accessToken, refreshToken } = await generateAcessAndRefreshToken(
      user._id
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { user: loggedInUser, accessToken, refreshToken },
          "User logged in successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while login user"
    );
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  // req.user.refreshToken = undefined;
  // req.user.save({ validateBeforeSave: false });

  const result = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { validateBeforeSave: false }
  );

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await generateAcessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed")
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const updateUserPassword = asyncHandler(async (req, res) => {
  //get the current password and new password from user
  // validate input
  //check if the current password is valid
  //set the new password
  // return the message with success
  console.log(req.body);
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (!(currentPassword && newPassword && confirmNewPassword)) {
    throw new ApiError(400, "All fields are required");
  }

  if (!(newPassword === confirmNewPassword)) {
    throw new ApiError(400, "newPassword and confirm password does not match");
  }

  const user = await User.findById(req.user._id);

  const passwordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!passwordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  req.user.password = newPassword;
  await req.user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updates successfully"));
});

const updateUserInfo = asyncHandler(async (req, res) => {
  //take input of feild we want user can change
  // validate it
  // save it
  //return updated info to user

  const { fullName, email } = req.body;

  if (!(fullName && email)) {
    throw new ApiError(400, "All fields are required");
  }

  req.user.fullName = fullName;
  req.user.email = email;
  await req.user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User updates successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //take avtar image as input
  //validate it
  //upload using mulyer
  //upload on cloudinary
  //update it in databse
  //if uploded return success response and url
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "there was some problem while uploading Avatar");
  }

  const oldAvatar = req.user.avatar;
  req.user.avatar = avatar.url;
  await req.user.save();

  const deleteAvatar = await deleteOnCloudinary(
    oldAvatar.split("\\").pop().split("/").pop().split(".")[0]
  );

  if (deleteAvatar.result !== "ok") {
    throw new ApiError(
      500,
      "there was some error while deleting image on cloudinary"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { avatar: avatar.url },
        "avatar uploaded successfully"
      )
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(500, "There was some problem upladoing cover image");
  }

  const oldCoverImage = req.user.coverImage;
  req.user.coverImage = coverImage.url;
  await req.user.save();

  const deleteCoverImage = await deleteOnCloudinary(
    oldCoverImage.split("\\").pop().split("/").pop().split(".")[0]
  );

  if (deleteCoverImage.result !== "ok") {
    throw new ApiError(
      500,
      "there was some error while deleting image on cloudinary"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { coverImage: coverImage.url },
        "Cover image updated successfully"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"));
});

const getChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "no channel name provided");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribeToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel, "channel profile fetched successfully")
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history fetched successfully"
      )
    );
});

export {
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
};
