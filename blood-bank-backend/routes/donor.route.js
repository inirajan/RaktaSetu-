import { Router } from "express";
import {
  donationRequestController,
  donorLoginController,
  donorLogoutController,
  donorRegisterControl,
  getBloodRequestHistroy,
  getDonoationHistory,
  getDonorProfile,
  requestBloodAsDonor,
  updateDonorProfile,
  verifyDonorNewEmail,
} from "../controllers/donor.controller.js";
import { verifyEmail } from "../controllers/donor.controller.js";
import { verifyRoles } from "../middlewares/verifyRoles.middleware.js";
import { auth } from "../middlewares/auth.middleware.js";

const donorRoute = Router();

donorRoute.route("/register").post(donorRegisterControl); //Register
donorRoute.route("/verifyEmail").get(verifyEmail);
donorRoute.route("/login").post(donorLoginController);
donorRoute.route("/verify-new-email").get(verifyDonorNewEmail);

// Applying authentication and role verification middleware
donorRoute.use(auth, verifyRoles("donor"));

//Patient Logout
donorRoute.route("/logout").post(donorLogoutController);

//donation request and blood request management
donorRoute.route("/requestDonation").post(donationRequestController);
donorRoute.route("/request-blood").post(requestBloodAsDonor);
donorRoute.route("/donation-history").get(getDonoationHistory);
donorRoute.route("/request-history").get(getBloodRequestHistroy);

//updating and viewing profile
donorRoute.route("/profile").get(getDonorProfile);
donorRoute.route("/profile").patch(updateDonorProfile);

export { donorRoute };
