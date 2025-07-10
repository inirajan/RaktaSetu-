export class apiError extends Error {
  constructor(
    status,
    message = "An error occured",
    name = "API error",
    stack = ""
  ) {
    super(message);
    this.name = name;
    this.status = status;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
