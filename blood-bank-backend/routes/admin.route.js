import { Router } from "express";
import {
  adminLoginController,
  adminLogoutController,
  bloodRequestController,
  donationRequestController,
  managePatients,
  sendDonorInfoToRequester,
} from "../controllers/admin.controller.js";
import { getDashboardStacks } from "../controllers/admin.controller.js";
import { updateStock } from "../controllers/admin.controller.js";
import { manageDonors } from "../controllers/admin.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { verifyRoles } from "../middlewares/verifyRoles.middleware.js";

const adminRoute = Router();

//Admin login
adminRoute.route("/login").post(adminLoginController);

//authentication and "admin" role
adminRoute.use(auth, verifyRoles("admin"));

//admin logout dashboard and stock
adminRoute.route("/logout").post(adminLogoutController);
adminRoute.route("/dashboard/stats").get(getDashboardStacks);
adminRoute.route("/stock").patch(updateStock);

//Donor Management
adminRoute.route("/donors/search").get(manageDonors.getDonorsByBloodGroup);
adminRoute.route("/donors").get(manageDonors.getAllDonors);
adminRoute.route("/donors/:id").get(manageDonors.getDonorsById);
adminRoute.route("/donors/:id").put(manageDonors.updateDonor);
adminRoute.route("/donors/:id").delete(manageDonors.deleteDonor);

//Patient Management
adminRoute.route("/patients").get(managePatients.getAllPatient);
adminRoute.route("/patients/:id").get(managePatients.getPatientById);
adminRoute.route("/patients/:id").put(managePatients.updatePatient);
adminRoute.route("/patients/:id").delete(managePatients.deletePatients);

//Donation Controllers management.
adminRoute
  .route("/donations")
  .get(donationRequestController.getAllDonationRequests);
adminRoute
  .route("/donation-requests")
  .patch(donationRequestController.handleDonationRequest);

//Blood Request Management
adminRoute.route("/bloods").get(bloodRequestController.getAllBloodRequest);
adminRoute
  .route("/blood-requests")
  .patch(bloodRequestController.handleBloodRequest);
adminRoute
  .route("/blood-requests/history")
  .get(bloodRequestController.getAllBloodRequestHistory);

//senging donor information
adminRoute
  .route("/blood-requests/send-donor-info")
  .post(sendDonorInfoToRequester);

export { adminRoute };
