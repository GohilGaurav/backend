import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const isObectIdValid = (id) => {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(id);
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  //get video id
  //check if its valid id
  //check if video exists if yes then add it to liked videos
  const { videoID } = req.params;
  if (!isObectIdValid(videoID)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoID);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const likeExists = await Like.findOne({ likedBy: req.user._id });
  if (!likeExists) {
    const like = await Like.create({
      videos: videoID,
      likedBy: req.user._id,
    });

    return res.status(200).json(new ApiResponse(200, like, "Video liked"));
  } else if (likeExists.videos.includes(videoID)) {
    let index = likeExists.videos.indexOf(videoID);
    likeExists.videos.splice(index, 1);
  } else {
    likeExists.videos.push(videoID);
  }

  await likeExists.save();
  return res
    .status(200)
    .json(new ApiResponse(200, likeExists, "Video like toggled"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentID } = req.params;
  if (!isObectIdValid(commentID)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentID);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const likeExists = await Like.findOne({ likedBy: req.user._id });
  if (!likeExists) {
    const like = await Like.create({
      likedBy: req.user._id,
      comments: commentID,
    });

    return res.status(200).json(new ApiResponse(200, like, "Commenr liked"));
  } else if (likeExists.comments.includes(commentID)) {
    let index = likeExists.comments.indexOf(commentID);
    likeExists.comments.splice(index, 1);
  } else {
    likeExists.comments.push(commentID);
  }

  await likeExists.save();
  return res
    .status(200)
    .json(new ApiResponse(200, likeExists, "Commenrtlike toggled"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetID } = req.params;
  if (!isObectIdValid(tweetID)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetID);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const likeExists = await Like.findOne({ likedBy: req.user._id });
  if (!likeExists) {
    const like = await Like.create({
      likedBy: req.user._id,
      tweets: tweetID,
    });

    return res.status(200).json(new ApiResponse(200, like, "Tweet liked"));
  } else if (likeExists.tweets.includes(tweetID)) {
    let index = likeExists.tweets.indexOf(tweetID);
    likeExists.tweets.splice(index, 1);
  } else {
    likeExists.tweets.push(tweetID);
  }

  await likeExists.save();

  return res
    .status(200)
    .json(new ApiResponse(200, likeExists, "Tweet like toggled"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $project: {
        videos: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "All liked videos fetched successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
