import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    avatarLocalPath = req.files.coverImage[0].path;
    avatar = await uploadOnCloudinary(coverImageLocalPath);
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

  avatar = await uploadOnCloudinary(avatarLocalPath);

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
export { registerUser };
