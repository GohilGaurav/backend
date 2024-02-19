import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
  //get the channel id
  //check if its valid
  //if valid then subscribe or unsubscribe
  const { channelID } = req.params;

  const channel = await User.findById(channelID);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  } else {
    const isSubscribed = await Subscription.findOne({
      subscriber: req.user._id,
      channel: channelID,
    });
    if (isSubscribed) {
      const unsubscribed = await Subscription.deleteOne({
        _id: isSubscribed._id,
      });

      if (unsubscribed.deletedCount !== 1) {
        throw new ApiError(400, "There was some problem while unsubscribing");
      }

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Channel Unsubscribed successfully"));
    } else {
      const newSubscribe = await Subscription.create({
        subscriber: req.user._id,
        channel: channelID,
      });

      if (!newSubscribe) {
        throw new ApiError(400, "There was some problem while subscribing");
      }

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Channel Subscribed Successfully"));
    }
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  //get the channel id
  //check if its correct id
  //check if channel exists
  //if yes then check subscribers and return data

  const { channelID } = req.params;
  const channel = User.findById(channelID);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelID),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
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
        subscriber: {
          $first: "$subscriber",
        },
      },
    },
    {
      $project: {
        _id: 0,
        subscriber: 1,
        total_subscribers: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "List of channel's subscriber fetched successfully"
      )
    );
});

const getSubscribedChannel = asyncHandler(async (req, res) => {
  //get user id from req
  //get all channels user subscribed to using aggregation
  //return response

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
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
        channel: {
          $first: "$channel",
        },
      },
    },
    {
      $project: {
        _id: 0,
        channel: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channels,
        "List of subscriebd challens fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannel };
