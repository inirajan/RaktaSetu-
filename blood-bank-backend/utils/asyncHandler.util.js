export const asyncHandler = (Function) => async (req, res, next) => {
  try {
    await Function(req, res, next);
  } catch (error) {
    next(error);
  }
};
