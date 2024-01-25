import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

    if (!user.isPasswordCorrect(password)) {
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

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
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
export { registerUser, loginUser, logoutUser, refreshAccessToken };
