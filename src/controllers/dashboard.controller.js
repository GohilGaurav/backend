import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";

const isObectIdValid = (id) => {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(id);
};

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const { channelID } = req.params;

  if (!isObectIdValid(channelID)) {
    throw new ApiError(400, "Inavlid channel id");
  }

  const user = await User.findById(channelID);
  if (!user) {
    throw new ApiError(404, "Channel not found");
  }

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelID),
      },
    },
    {
      $group: {
        _id: "$owner",
        totalViews: {
          $sum: "$views",
        },
        videos: { $push: "$$ROOT" },
      },
    },
  ]);

  const subscribers = await Subscription.find({ channel: channelID });

  const likes = await Video.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelID),
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: videos.videos,
        totalViews: videos.totalViews,
        subscribers,
        likes,
      },
      "stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelID } = req.params;
  if (!isObectIdValid(channelID)) {
    throw new ApiError(400, "Inavlid channel id");
  }
  const videos = await Video.find({ owner: channelID });

  return res
    .status(200)
    .json(
      new ApiResponse(200, videos, "All channnel videos fecthed successfully")
    );
});

export { getChannelStats, getChannelVideos };
