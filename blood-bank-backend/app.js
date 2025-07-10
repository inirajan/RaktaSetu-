import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.middleware.js";
import { adminRoute } from "./routes/admin.route.js";
import { donorRoute } from "./routes/donor.route.js";
import { patientRoute } from "./routes/patient.route.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

app.use("/api/admin", adminRoute);
app.use("/api/donor", donorRoute);
app.use("/api/patient", patientRoute);
app.use(globalErrorHandler);

export { app };
