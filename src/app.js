import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

//Cross Origin Resource Sharing Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//For handing json
app.use(
  express.json({
    limit: "16kb",
  })
);

//For handing url encoded values
app.use(express.urlencoded({ extended: false, limit: "16kb" }));

//for serving static files
app.use(express.static("public"));

app.use(cookieParser());

//import router
import userRouter from "./routes/user.route.js";

//route declaration
app.use("/api/v1/users", userRouter);

export { app };
