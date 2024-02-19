import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";

const isObectIdValid = (id) => {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(id);
};

const getAllVideos = asyncHandler(async (req, res) => {
  //fetch all videos and just return all
  //const videos = await Video.find();

  const { page = 0, limit = 2, query, sortBy, sortType, userId } = req.query;

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    { $skip: limit * page },
    { $limit: Number(limit) },
    {
      $sort: {
        createdAt: Number(sortType),
      },
    },
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
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  //take user input
  //validate user data
  //upload video using multer
  //get local path
  //upload video on cloudinary
  //create new record
  //return response

  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "All fields are required");
  }

  let thumbnailLocalPath, videoLocalPath;
  if (req.files && req.files?.video && req.files?.video.length > 0) {
    videoLocalPath = req.files.video[0].path;
  }
  if (req.files && req.files.thumbnail && req.files?.thumbnail.length > 0) {
    thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  }
  if (!videoLocalPath) throw new ApiError(400, "Video file is required");
  if (!thumbnailLocalPath)
    throw new ApiError(400, "Thumbnail file is required");

  const video = await uploadOnCloudinary(videoLocalPath);
  if (!video)
    throw new ApiError(500, "There was some problem while uploading video");

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail)
    throw new ApiError(500, "There was some problem while uploading thumbnail");

  const newVideo = await Video.create({
    title,
    description,
    thumbnail: thumbnail.url,
    videoFile: video.url,
    duration: video.duration,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, newVideo, "Video Published Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  //get id from url
  //find data using id
  //if no data return error if data is there return data
  const { videoID } = req.params;

  if (!isObectIdValid(videoID)) {
    throw new ApiError(400, "Inavlid video Id");
  }

  //const video = await Video.findById(videoID);

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoID),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
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
  ]);

  if (!video) throw new ApiError(404, "Video not found");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video details fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //take input
  //validate
  //check if the video id is correct
  //check if the user is owner then update
  //if correct update and reutn update data
  const { title, description } = req.body;
  const { videoID } = req.params;

  if (!isObectIdValid(videoID)) {
    throw new ApiError(400, "Inavlid video Id");
  }

  const thumbnailLocalPath = req.file?.path;

  if (!title || !description)
    throw new ApiError(400, "All fields are required");

  const oldVideo = await Video.findOne({
    _id: videoID,
    owner: req.user._id,
  });

  if (!oldVideo) {
    throw new ApiError(
      400,
      "Video doesnot exist or you done have access to it"
    );
  }

  let newThumbnail;
  if (thumbnailLocalPath) {
    newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!newThumbnail)
      throw new ApiError(
        500,
        "There was some problem while uploading thumbnail"
      );

    const oldThumbnail = await deleteOnCloudinary(
      oldVideo.thumbnail.split("\\").pop().split("/").pop().split(".")[0]
    );

    if (oldThumbnail.result !== "ok") {
      throw new ApiError(400, "There was some error while deleting image");
    }
  }

  const video = await Video.findOneAndUpdate(
    {
      _id: videoID,
      owner: req.user._id,
    },
    {
      $set: {
        title,
        description,
        thumbnail: newThumbnail?.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details updates successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  //check if id  is valid
  //if valid check if it is owner by current user
  //if yes then delete record and also delete thumbnail and video file
  //send response message
  const { videoID } = req.params;
  if (!isObectIdValid(videoID)) throw new ApiError(400, "Inavlid video id");

  const video = await Video.findOne({
    _id: videoID,
    owner: req.user._id,
  });

  if (!video)
    throw new ApiError(400, "Video not found or you dont have access to it");

  const deleteVideo = await deleteOnCloudinary(
    video.videoFile.split("\\").pop().split("/").pop().split(".")[0],
    "video"
  );

  console.log(video.videoFile.split("\\").pop().split("/").pop().split(".")[0]);

  if (deleteVideo?.result !== "ok") {
    throw new ApiError(
      500,
      "there was some error while deleting video on cloudinary"
    );
  }

  const deleteThumbnail = await deleteOnCloudinary(
    video.thumbnail.split("\\").pop().split("/").pop().split(".")[0]
  );

  if (deleteThumbnail?.result !== "ok") {
    throw new ApiError(
      500,
      "there was some error while deleting thumbnail on cloudinary"
    );
  }

  const deletedVideo = await Video.deleteOne({ _id: videoID });

  if (deletedVideo.deletedCount !== 1) {
    throw new ApiError(400, "There was some problem while deleting video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video Deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  //take video id as input
  //validate id
  //check if the video exist and user is the owner
  //if yes then update the status
  const { videoID } = req.params;
  if (!isObectIdValid(videoID)) throw new ApiError(400, "Invalid video id");

  const video = await Video.findOne({ _id: videoID, owner: req.user._id });

  if (!video) {
    throw new ApiError(
      400,
      "Video does not exist or you dont have access to it"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "Video publish status updated successfully")
    );
});

export {
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getAllVideos,
};
