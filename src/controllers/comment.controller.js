import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";

const isObectIdValid = (id) => {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(id);
};

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoID } = req.params;
  if (!isObectIdValid(videoID)) {
    throw new ApiError(400, "Invalid video id");
  }

  //   const comments = await Comment.find({ video: videoID });
  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoID),
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
    {
      $project: {
        content: 1,
        owner: 1,
      },
    },
  ]);

  if (!comments) {
    throw new ApiError(400, "There was some problem while fetcching comments");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoID } = req.params;

  if (!isObectIdValid(videoID)) {
    throw new ApiError(400, "Invalid video id");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const video = await Video.findById(videoID);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const comment = await Comment.create({
    content,
    owner: req.user._id,
    video: videoID,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Commented successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentID } = req.params;

  if (!isObectIdValid(commentID)) {
    throw new ApiError(400, "Invalid video id");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const comment = await Comment.findOne({
    _id: commentID,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(400, "Comment not found or you dont have access to it");
  }

  const updatedComment = await Comment.findOneAndUpdate(
    {
      _id: commentID,
    },
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentID } = req.params;

  if (!isObectIdValid(commentID)) {
    throw new ApiError(400, "Invalid video id");
  }

  const comment = await Comment.findOne({
    _id: commentID,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(400, "Comment not found or you dont have access to it");
  }

  const deleteComment = await Comment.deleteOne({
    _id: commentID,
  });

  if (deleteComment.deletedCount !== 1) {
    throw new ApiError(400, "There was some problem while deleting comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
