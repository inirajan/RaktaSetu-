import { adminModel } from "../models/admin.model.js";
import { asyncHandler } from "../utils/asyncHandler.util.js";
import { apiError } from "../utils/apiError.util.js";
import { ApiResponse } from "../utils/apiResponse.util.js";
import { bloodReqModel } from "../models/bloodReq.model.js";
import { bloodStockModel } from "../models/bloodStock.model.js";
import { donationReqsModel } from "../models/donationReqs.model.js";
import { patientModel } from "../models/patient.model.js";
import { donorModel } from "../models/donor.model.js";
import mongoose from "mongoose";

export const adminLoginController = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  console.log("admin", req.body);

  if (!username || !password) {
    throw new apiError(
      400,
      "Username and password are required",
      "Username and Password is required"
    );
  }

  const admin = await adminModel.findOne({
    username,
  });

  console.log(admin);
  //basic validation for admin
  if (!admin) {
    throw new apiError(404, "Admin not found", "provide admin");
  }

  //basic validation for admin password
  const isPaswordCorrect = await admin.checkPassword(password);

  if (!isPaswordCorrect) {
    throw new apiError(401, "Invalid credentails", "provide password");
  }

  //generating accessToken through cookie
  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();
  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });
  // console.log(accessToken);

  //cookie oprions
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7days for refresh token
  };

  //Prepare logged-in admin data
  const loggedInAdmin = {
    _id: admin._id,
    username: admin.username,
    role: admin.role,
  };

  console.log(loggedInAdmin);
  res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...options,
      maxAge: 1 * 60 * 60 * 1000, // 1 hour for access token
    })
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { admin: loggedInAdmin, accessToken },
        "Admin logged in successfully"
      )
    );
});

//admin logout
export const adminLogoutController = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new apiError(
      401,
      "Admin not authenticated for logout",
      " Unauthorized"
    );
  }
  await adminModel.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, //unset is poper way to remove a field
      },
    },
    {
      new: true,
    }
  );

  //define the cookie options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "admin logged out successfully"));
});

//Dashboard Stacks
export const getDashboardStacks = asyncHandler(async (req, res) => {
  try {
    const [
      donorCount,
      patientCount,
      donationCountsRaw,
      bloodCountsRaw,
      bloodStock,
    ] = await Promise.all([
      donorModel.countDocuments(),
      patientModel.countDocuments(),
      donationReqsModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      bloodReqModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      bloodStockModel.find({}).lean(),
    ]);

    const donationStats = { total: 0, Approved: 0, Pending: 0, Rejected: 0 };
    donationCountsRaw.forEach((item) => {
      const status = item._id;
      if (donationStats.hasOwnProperty(status)) {
        donationStats[status] = item.count;
      }
      donationStats.total += item.count;
    });

    const bloodStats = { total: 0, Approved: 0, Pending: 0, Rejected: 0 };
    bloodCountsRaw.forEach((item) => {
      const status = item._id;
      if (bloodStats.hasOwnProperty(status)) {
        bloodStats[status] = item.count;
      }
      bloodStats.total += item.count;
    });

    const totalUnits = bloodStock.reduce((sum, stock) => sum + stock.unit, 0);

    const dashboardData = {
      patients: patientCount,
      donors: donorCount,
      bloodStock,
      totalUnits,
      donationRequests: donationStats,
      bloodRequests: bloodStats,
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: dashboardData,
      message: "Dashboard statistics fetched successfully.",
    });
  } catch (error) {
    console.error(`Error in getDashboardStacks: ${error.message}`);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to fetch dashboard statistics.",
      error: error.message,
    });
  }
});

//bloodStock Controller
export const updateStock = asyncHandler(async (req, res) => {
  const { bloodGroup, unit } = req.body;
  console.log(req.body);

  //validating
  if (!bloodGroup || typeof unit !== "number" || unit < 0) {
    throw new apiError(
      400,
      "Provide BloodGroup and Units",
      "invalid BloodGroup or units"
    );
  }

  const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (!validBloodGroups.includes(bloodGroup)) {
    throw new apiError(
      400,
      `Invalid blood group: ${bloodGroup}`,
      "InvalidBloodGroup"
    );
  }

  //finding exsiting stock or create a new one
  let stock = await bloodStockModel.findOneAndUpdate(
    { bloodGroup },
    { unit },
    { upsert: true, runValidators: true }
  );

  console.log(stock);
  res
    .status(200)
    .json(new ApiResponse(200, stock, "Blood stock update successfully"));
});

//donor Management
export const manageDonors = {
  //for viewing all donors
  getAllDonors: asyncHandler(async (req, res) => {
    const donors = await donorModel.find().select("-password -refreshToken"); //this means password will not show
    res.status(200).json(new ApiResponse(200, donors, "viewing Donors"));
  }),

  //for viewing Only one donors
  getDonorsById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new apiError(400, "Invalid Donor ID format.", "InvalidID");
    }

    const donor = await donorModel
      .findById(id)
      .select("-password -refreshToken"); //-password means not include

    if (!donor) {
      throw new apiError(404, "Donor not Found", "provide donors Id");
    }
    res.status(200).json(new ApiResponse(200, donor, "Donor Found"));
  }),

  //upadting donors:
  updateDonor: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new apiError(400, "Invalid Donor ID format.", "InvalidID");
    }

    //removing password, refreshToken, role field from updates object
    delete updates.password;
    delete updates.refreshToken;
    delete updates.role; //Admin should not change roles via this update

    //basis validataion
    const updateAge =
      updates.age !== undefined &&
      (typeof updates.age !== "number" ||
        updates.age <= 0 ||
        updates.age > 120);
    if (updateAge) {
      throw new apiError(
        400,
        "Age must be a valid number between 1 and 120.",
        "InvalidAge"
      );
    }

    const updateBloodGroups =
      updates.blooGroup &&
      !["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(
        updates.blooGroup
      );
    if (updateBloodGroups) {
      throw new apiError(
        400,
        "Invalid blood group provided.",
        "InvalidBloodGroup"
      );
    }

    const updateEmail =
      updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email);
    if (updateEmail) {
      throw new apiError(
        400,
        "Please provide a valid email address.",
        "InvalidEmailFormat"
      );
    }

    const updateFullName =
      updates.fullName !== undefined && updates.fullName.trim() === "";
    if (updateFullName) {
      throw new apiError(400, "Full name cannot be empty.", "InvalidFullName");
    }

    const updateDonor = await donorModel
      .findByIdAndUpdate(id, updates, {
        new: true, //return the updated doc
        runValidators: true, // run schema validators
      })
      .select("-password -refreshToken");
    console.log(updateDonor);

    //validating
    if (!updateDonor) {
      throw new apiError(404, "Donor doesnt exits", "Donor not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, updateDonor, "Donor updated successfully"));
  }),

  //deleting donors
  deleteDonor: asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new apiError(400, "Invalid Donor ID format.", "InvalidID");
    }

    const deleteDonor = await donorModel.findByIdAndDelete(id);
    console.log(deleteDonor);
    if (!deleteDonor) {
      throw new apiError(404, "Donor is not deleted", "Donor not found");
    }

    //deleting both donation request and blood request
    await donationReqsModel.deleteMany({ donorId: id });
    await bloodReqModel.deleteMany({ requesterId: id, requesterType: "donor" });

    res.status(200).json(new ApiResponse(200, null, "Donor is deleted"));
  }),

  //search donor by blood Group
  getDonorsByBloodGroup: asyncHandler(async (req, res) => {
    const { bloodGroup } = req.query;

    const normalGroup = {
      aplus: "A+",
      aminus: "A-",
      bplus: "B+",
      bminus: "B-",
      abplus: "AB+",
      abminus: "AB-",
      oplus: "O+",
      ominus: "O-",
    };
    console.log(req.query);

    const searchableBloodGroup = normalGroup[bloodGroup];
    console.log(typeof searchableBloodGroup);

    //finding matching blood group
    const query = {
      bloodGroup: searchableBloodGroup,
      isEmailVerified: true,
    };

    const donors = await donorModel
      .find(query)
      .select("fullName email bloodGroup lastDonationDate diseases")
      .lean();

    if (!donors || donors.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            [],
            `No email-verified donor found for blood group ${searchableBloodGroup}.`
          )
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          donors,
          `Found ${donors.length} donor(s) for blood group ${searchableBloodGroup} `
        )
      );
  }),
};

//patient Management
export const managePatients = {
  //viewing all patiens
  getAllPatient: asyncHandler(async (req, res) => {
    const patients = await patientModel
      .find({})
      .select("-password -refreshToken");
    res.status(200).json(new ApiResponse(200, patients, "viewing all donors"));
  }),

  //viewing patient by id
  getPatientById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new apiError(400, "Invalid Patient ID format.", "InvalidID");
    }

    const getPatientById = await patientModel
      .findById(id)
      .select("-passsword -refreshToken");

    console.log(getPatientById);
    if (!getPatientById) {
      throw new apiError(404, "Patient not found", "provide Id");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, getPatientById, "Patient fetched successfully")
      );
  }),

  //patient update
  updatePatient: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new apiError(400, "Invalid Patient ID format.", "InvalidID");
    }

    delete updates.password;
    delete updates.refreshToken;
    delete updates.role;

    //basic validation
    const updateAge =
      updates.agen !== undefined &&
      (typeof updates.age !== "number" ||
        updates.age <= 0 ||
        updates.age > 120);

    if (updateAge) {
      throw new apiError(
        400,
        "Age must be a valid number between 1 and 120.",
        "InvalidAge"
      );
    }

    const updateBlooGroups =
      updates.blooGroup &&
      !["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(
        updates.blooGroup
      );

    if (updateBlooGroups) {
      throw new apiError(
        400,
        "Invalid blood group provided.",
        "InvalidBloodGroup"
      );
    }

    const updateEmail =
      updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email);

    if (updateEmail) {
      throw new apiError(
        400,
        "Please provide a valid email address.",
        "InvalidEmailFormat"
      );
    }

    const updateFullName =
      updates.fullName !== undefined && updates.fullName.trim() === "";

    if (updateFullName) {
      throw (
        (new apiError(400), "Full name cannot be empty.", "InvalidFullName")
      );
    }

    const updatePatient = await patientModel
      .findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      })
      .select("-password -refreshToken");
    console.log(updatePatient);

    if (!updatePatient) {
      throw new apiError(404, "Patient not found", "patient doesnot exits");
    }

    res
      .status(200)
      .json(new ApiResponse(200, updatePatient, "Patient Fetch Successfully"));
  }),

  //deleting donors
  deletePatients: asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new apiError(400, "Invalid Patient ID format.", "InvalidID");
    }

    const deletePatients = await patientModel.findByIdAndDelete(id);

    console.log(deletePatients);
    if (!deletePatients) {
      throw new apiError(404, "Patient is not deleted", "Patient not found");
    }

    //delete blood request
    await bloodReqModel.deleteMany({
      requesterId: id,
      requesterType: "patient",
    });

    res.status(200).json(new ApiResponse(200, null, "Donor is deleted"));
  }),
};

//Donation Request Management
export const donationRequestController = {
  //---Get All Donation Request----
  getAllDonationRequests: asyncHandler(async (req, res) => {
    const donationRequest = await donationReqsModel
      .find({})
      .populate("donorId", "fullName email bloodGroup") //populate donor detail from donorModel
      .populate("approved", "username"); // populate admin detail from adminModel
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          donationRequest,
          "All dontaion requests feteched successfully"
        )
      );
  }),

  //--Handle Donation Request(Approved,Rejected)
  handleDonationRequest: asyncHandler(async (req, res) => {
    const { requestId, action, adminComments } = req.body;
    console.log("dRequest", req.body);

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new apiError(400, "Invalid Request ID format.", "InvalidID");
    }

    if (!["Approved", "Rejected"].includes(action)) {
      throw new apiError(
        400,
        "Invalid action specified. Must be 'Approved' or 'Rejected'",
        "Must be Approved or Rejected"
      );
    }

    const donationRequest = await donationReqsModel.findById(requestId);

    if (!donationRequest) {
      throw new apiError(404, "Donation Request not found", "request donation");
    }

    if (donationRequest.status !== "Pending") {
      throw new apiError(
        400,
        `Donation request already ${donationRequest.status}`,
        "cannot make new   request "
      );
    }

    //common field for donation approvel and rejections
    donationRequest.approved = req.user._id; //Assuming req.user._id contains the approving admin's ID
    donationRequest.approvalDate = new Date();
    if (adminComments) {
      donationRequest.adminComments = adminComments;
    }

    if (action === "Approved") {
      const donor = await donorModel.findById(donationRequest.donorId);

      if (!donor) {
        throw new apiError(
          404,
          "associated donor found",
          "make new donation request"
        );
      }

      //checking for donor diseases.
      const donorDiseases =
        donor.diseases &&
        Array.isArray(donor.diseases) &&
        donor.diseases.length > 0 &&
        donor.diseases.some((d) => d && d.toLowerCase() !== "none");

      if (donorDiseases) {
        console.warn(
          `Admin approving donation from donor ${
            donor.fullName
          } with diseases: ${donor.diseases.join(",")}`
        );
      }

      try {
        donationRequest.status = "Approved";
        await donationRequest.save();

        donor.lastDonationDate = new Date();
        await donor.save();

        //adding unit to blood stock
        await bloodStockModel.findOneAndUpdate(
          { bloodGroup: donor.bloodGroup },
          { $inc: { unit: donationRequest.unit } },
          { upsert: true, new: true, runValidators: true }
          // { upsert: true, new: true, session: session, runValidators: true }
        );

        // await session.commitTransaction();
        // session.endSession();

        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              donationRequest,
              "Donation request approved and blood added to stock"
            )
          );
      } catch (error) {
        // await session.startTransaction();
        // session.startSession();
        throw new apiError(
          500,
          error.messsage ||
            "Failed to approve donation request and update stock",
          "again make request"
        );
      }
    } else if (action === "Rejected") {
      donationRequest.status = "Rejected";
      await donationRequest.save();
      return res
        .status(200)
        .json(
          new ApiResponse(200, donationRequest, "Donation request rejected")
        );
    }
  }),
};

//Blood Request Management
export const bloodRequestController = {
  //Get All Blood Requests:
  getAllBloodRequest: asyncHandler(async (req, res) => {
    const bloodRequest = await bloodReqModel
      .find({})
      .populate("requesterId", "fullName email bloodGroup") // Populate requester details (donor or patient)
      .populate("approvedBy", "username"); //populate admin details if "approvedBy   " field exits

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          bloodRequest,
          "All blood requests fetched successfully."
        )
      );
  }),

  //Handle Blood request(Approved, Rejected)
  handleBloodRequest: asyncHandler(async (req, res) => {
    const { requestId, action, adminComments } = req.body;
    console.log("blood requests", req.body);

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new apiError(400, "Invalid Request ID formate", "Invalid Id");
    }

    const bloodRequests = await bloodReqModel.findById(requestId);

    if (!bloodRequests) {
      throw new apiError(400, "Blood Request not found", "Request not found");
    }

    // Check if units requested is 0, or if action is 'Approved' and stock is zero
    if (bloodRequests.unit === 0 && action === "Approved") {
      bloodRequests.status = "Rejected"; // Automatically set status to Rejected
      bloodRequests.adminComments =
        adminComments || "Rejected: Cannot approve 0 units.";
      await bloodRequests.save(); // Save the request with rejected status

      throw new apiError(
        400, // Changed status to 400 as it's a client-side input issue
        `Cannot approve a request for 0 blood units. Request has been rejected.`,
        "CannotApproveZeroUnits"
      );
    }

    if (!["Approved", "Rejected"].includes(action)) {
      throw new apiError(
        400,
        "Invalid action specified. Must be 'Approved' or 'Rejected'",
        "Invalid Action"
      );
    }

    if (bloodRequests.status !== "Pending") {
      throw new apiError(
        400,
        `blood request is ${bloodRequests.status}`,
        "Request already handle"
      );
    }

    //common filed for blood request approved and rejection
    bloodRequests.approvedBy = req.user._id; //asssuming req.user._id conatin approving admin's Id
    bloodRequests.approvalDate = new Date();

    if (adminComments) {
      bloodRequests.adminComments = adminComments;
    }

    if (action === "Approved") {
      try {
        const bloodStock = await bloodStockModel.findOne({
          bloodGroup: bloodRequests.bloodGroup,
        });

        //  Check for insufficient stock or zero stock
        if (!bloodStock || bloodStock.unit < bloodRequests.unit) {
          bloodRequests.status = "Rejected";
          bloodRequests.adminComments =
            adminComments || "Rejected: Insufficient blood stock";
          await bloodRequests.save();
          throw new apiError(
            400,
            `Insufficient blood units for ${
              bloodRequests.bloodGroup
            }. Available: ${bloodStock ? bloodStock.unit : 0}. Request: ${
              bloodRequests.unit
            }`,
            "Insufficient Stock"
          );
        }

        //Reducing blood Stock
        bloodStock.unit -= bloodRequests.unit;
        await bloodStock.save();

        bloodRequests.status = "Approved";
        await bloodRequests.save();

        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              bloodRequests,
              "Blood Request approved and blood stock update"
            )
          );
      } catch (err) {
        console.error("Error approving blood Requests ", err);
        // Only throw a general error if it's not the specific insufficient stock message
        throw new apiError(
          500,
          err.message ||
            "Failed to approve blood request and update blood stock",
          "Operation failed"
        );
      }
    } else if (action === "Rejected") {
      bloodRequests.status = "Rejected";
      await bloodRequests.save();

      return res
        .status(200)
        .json(new ApiResponse(200, bloodRequests, "Blood Request Rejected"));
    }
  }),

  // Get all blood request history
  getAllBloodRequestHistory: asyncHandler(async (req, res) => {
    const history = await bloodReqModel
      .find({})
      .populate("requesterId", "fullName email bloodGroup")
      .populate("approvedBy", "username")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          history,
          "All blood request history feteched successfully"
        )
      );
  }),
};

// send donor info for a specific blood request
export const sendDonorInfoToRequester = asyncHandler(async (req, res) => {
  const { bloodRequestId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bloodRequestId)) {
    throw new apiError(400, "Invalid Blood Request ID format.", "Invalid ID");
  }

  const bloodRequest = await bloodReqModel.findById(bloodRequestId);

  if (!bloodRequest) {
    throw new apiError(404, "Blood Request not found.", "RequestNotFound");
  }

  if (bloodRequest.status === "Approved") {
    throw new apiError(
      400,
      "Cannot send donor info for an approved request.",
      "InvalidStatus"
    );
  }

  // Fetch potential donors for the requested blood group
  const potentialDonors = await donorModel
    .find({
      bloodGroup: bloodRequest.bloodGroup,
      isEmailVerified: true,
    })
    .select("fullName email bloodGroup lastDonationDate diseases")
    .lean();

  bloodRequest.matchedDonorsInfo = potentialDonors;
  await bloodRequest.save({ validateBeforeSave: false }); // Save the updated request

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { bloodRequest: bloodRequest.toObject(), potentialDonors },
        "Donor information successfully sent to the requester's blood request."
      )
    );
});
