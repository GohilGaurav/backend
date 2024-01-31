import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //the one who is subscribing
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, //the one who has been subsctibed by subscriber || the channeel subscribed to
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
