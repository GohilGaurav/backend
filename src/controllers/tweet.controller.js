import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";

const createTweet = asyncHandler(async (req, res) => {
  //get input from user
  //validate
  //if valid then create new tweet
  //return response
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "tweet created successfully"));
});

const getMyTweets = asyncHandler(async (req, res) => {
  //get all tweets by user
  //return response
  const tweets = await Tweet.find({ owner: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "all user tweets fetched successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userID } = req.params;
  //get all tweets by user
  //return response
  const tweets = await Tweet.find({ owner: userID });

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "all user tweets fetched successfully"));
});

const getTweetByID = asyncHandler(async (req, res) => {
  //get all tweets by user
  //return response
  const { tweetID } = req.params;
  const tweet = await Tweet.findById(tweetID);

  if (!tweet) {
    throw new ApiError(400, "tweet not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "tweet fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //get id
  //check if its valid
  //find the tweet and check the user is owner
  //if yes then update
  //return response and new tweet
  const { tweetID } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "content is required");
  }

  const tweet = await Tweet.findOne({ _id: tweetID, owner: req.user._id });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found or you dont have access to it");
  }

  const newTweet = await Tweet.findOneAndUpdate(
    tweet._id,
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
    .json(new ApiResponse(200, newTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //get id
  //check if its valid
  //find the tweet and check the user is owner
  //if yes then delete
  //return response
  const { tweetID } = req.params;
  const tweet = await Tweet.findOne({ _id: tweetID, owner: req.user._id });

  if (!tweet) {
    throw new ApiError(
      404,
      "Tweet not found or you dont have any access to it"
    );
  }

  const deleteTweet = await Tweet.deleteOne({ _id: tweet._id });

  if (deleteTweet.deletedCount !== 1) {
    throw new ApiError(500, "There was some problem while deleting tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "tweet deleted successfully"));
});

export {
  createTweet,
  updateTweet,
  deleteTweet,
  getMyTweets,
  getTweetByID,
  getUserTweets,
};
