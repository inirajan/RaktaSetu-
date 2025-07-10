import { apiError } from "../utils/apiError.util.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";

export const verifyRoles = (...role) =>
  asyncHandler((req, res, next) => {
    if (!req.user || !role.includes(req.user.role)) {
      throw new apiError(403, "Access Denied", "Unauthorized Access");
    }
    next();
  });
