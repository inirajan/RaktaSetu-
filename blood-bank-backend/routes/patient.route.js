import { Router } from "express";
import {
  getBloodRequestHistroyAsPatient,
  getPatientDashboard,
  getPatientProflie,
  patientLoginController,
  patientLogoutController,
  patientRegisterControl,
  requestBloodAsPatient,
  updatePatientProfile,
  verifyEmail,
  verifyPatientNewEmail,
} from "../controllers/patient.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { verifyRoles } from "../middlewares/verifyRoles.middleware.js";
import { bloodReqModel } from "../models/bloodReq.model.js";
import { ApiResponse } from "../utils/apiResponse.util.js";
import { patientModel } from "../models/patient.model.js";
import { apiError } from "../utils/apiError.util.js";

const patientRoute = Router();

//patient login and logout
patientRoute.route("/register").post(patientRegisterControl);
patientRoute.route("/verifyEmail").get(verifyEmail);
patientRoute.route("/login").post(patientLoginController);
patientRoute.route("/verify-new-email").get(verifyPatientNewEmail);

// Applying authentication and role verification middleware
patientRoute.use(auth, verifyRoles("patient"));

//Patient Logout
patientRoute.route("/logout").post(patientLogoutController);

//patient request management
patientRoute.route("/dashboard").get(getPatientDashboard);
patientRoute.route("/request-blood").post(requestBloodAsPatient);
patientRoute.route("/my-request").get(getBloodRequestHistroyAsPatient);

//upating and viewing profile
patientRoute.route("/profile").get(getPatientProflie);
patientRoute.route("/profile").patch(updatePatientProfile);

export { patientRoute };
