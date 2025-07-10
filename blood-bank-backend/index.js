import "dotenv/config";
import { dbConnect } from "./config/db.config.js";
import { app } from "./app.js";

const port = process.env.PORT;
// calling port from .env
(async function () {
  try {
    await dbConnect();
    const server = app.listen(port, () => {
      console.log(`http://localhost:${port}`);
    });
    server.on("error", () => {
      throw new Error("Server Connection error");
    });
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
})();
