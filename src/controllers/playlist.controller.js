import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";

const isObectIdValid = (id) => {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(id);
};

const createPlaylist = asyncHandler(async (req, res) => {
  //get input from user
  //validate input
  //if input is fine then create playlist and return data
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "All fileds are required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  if (!playlist) {
    throw new ApiError(500, "There was some problem while creating playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userID } = req.params;
  if (!isObectIdValid(userID)) {
    throw new ApiError(400, "Inavlid user Id");
  }
  //get all the playlist of the user and return it
  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userID),
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
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User Playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  //get userid
  //fetch the playlist
  //return response
  const { playlistID } = req.params;
  if (!isObectIdValid(playlistID)) {
    throw new ApiError(400, "Inavlid playlist Id");
  }
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistID),
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
  ]);

  console.log(playlist);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  //get video id and playlist id
  const { videoID, playlistID } = req.params;

  if (!isObectIdValid(videoID) || !isObectIdValid(playlistID)) {
    throw new ApiError(400, "Inavlid video or playlist Id");
  }

  const playlist = await Playlist.findById(playlistID);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const video = await Video.findById(videoID);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(400, "You done have access to this playlist");
  }
  if (playlist.videos.includes(videoID)) {
    throw new ApiError(404, "Video is already added to playlist");
  } else {
    playlist.videos.push(videoID);
    await playlist.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video is added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  //get the video id and playlist id
  //check if both exists
  //check if its already there and if yes then remove it
  const { videoID, playlistID } = req.params;
  if (!isObectIdValid(videoID) || !isObectIdValid(playlistID)) {
    throw new ApiError(400, "Inavlid video or playlist Id");
  }
  const playlist = await Playlist.findById(playlistID);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const video = await Video.findById(videoID);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (playlist.videos.includes(videoID)) {
    const index = playlist.videos.indexOf(videoID);
    playlist.videos.splice(index, 1);
    await playlist.save();

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Video deleted from playlist"));
  } else {
    throw new ApiError(404, "Video is not in the playlist");
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
  //get playlist id and try deleting it
  const { playlistID } = req.params;
  if (!isObectIdValid(playlistID)) {
    throw new ApiError(400, "Inavlid playlist Id");
  }
  const playlist = await Playlist.findById(playlistID);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(404, "You dont have access to delete this playlist");
  }

  const deletePlaylist = await Playlist.deleteOne({ _id: playlistID });

  if (deletePlaylist.deletedCount !== 1) {
    throw new ApiError(500, "There was some problem while deleting playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  //get playlistid and input
  //validate
  //check if it exits and user has access to it
  //if yes then update and send updated data and responee

  const { playlistID } = req.params;
  if (!isObectIdValid(playlistID)) {
    throw new ApiError(400, "Inavlid playlist Id");
  }
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(404, "All fields are required");
  }

  const playlist = await Playlist.findById(playlistID);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  console.log(playlist.owner.equals(req.user._id));
  if (!playlist.owner.equals(req.user._id)) {
    throw new ApiError(404, "You dont have access to this playlist");
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistID },
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});
export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  updatePlaylist,
  deletePlaylist,
};
