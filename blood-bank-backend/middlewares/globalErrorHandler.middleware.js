export function globalErrorHandler(error, req, res, next) {
  const status = error.status || 500;
  const message = error.message;
  const name = error.name;
  const stack =
    process.env.NODE_ENV === "development" ? error.stack : undefined;
  res.status(status).json({
    Success: false,
    Error: {
      status,
      name,
      message,
      stack,
    },
  });
}
