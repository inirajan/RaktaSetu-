import jwt from "jsonwebtoken";
import { apiError } from "../utils/apiError.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";

export const auth = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new apiError(401, "No token is provided", " Unauthorized access");
  }

  try {
    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); //verifies the Jwt token received from the client
    // and decode the token and return playload(like username,user id)
    req.user = user; //sotres token palyload in req.user means you can acces authenticatd user details eg.req.admin.username
    next();
  } catch (err) {
    throw new apiError(401, "Invalid token", " Unazuthorized access");
  }
});
