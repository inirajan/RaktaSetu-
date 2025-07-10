import { asyncHandler } from "../utils/asyncHandler.util.js";
import { donorModel } from "../models/donor.model.js";
import { ApiResponse } from "../utils/apiResponse.util.js";
import { apiError } from "../utils/apiError.util.js";
import { tempModel } from "../models/temp.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.utils.js";
import { donationReqsModel } from "../models/donationReqs.model.js";
import { bloodReqModel } from "../models/bloodReq.model.js";
import { patientModel } from "../models/patient.model.js";
import crypto from "crypto";

export const donorRegisterControl = asyncHandler(async (req, res) => {
  const {
    fullName,
    age,
    bloodGroup,
    diseases,
    email,
    password,
    lastDonationDate,
  } = req.body;
  console.log("req", req.body);

  //basic validation
  if (!fullName || !age || !bloodGroup || !email || !password) {
    throw new apiError(400, " all filed are required", "emptyfield");
  }

  if (typeof age !== "number" || age <= 0 || age > 120) {
    throw new apiError(
      400,
      "Age must be a valid number between 1 and 120.",
      "Invalid Age"
    );
  }

  const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (!validBloodGroups.includes(bloodGroup)) {
    throw new apiError(
      400,
      "Invalid blood group provided. Please use one of: A+, A-, B+, B-, AB+, AB-, O+, O-.",
      "Invalid Blood Group"
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new apiError(
      400,
      "Please provide a valid email address.",
      "Invalid Email Format"
    );
  }

  if (password.length < 8) {
    throw new apiError(
      400,
      "Password must be at least 8 characters long.",
      "Password Too Short"
    );
  }

  const exstingDonor = await tempModel.findOne({ email });
  if (exstingDonor) {
    throw new apiError(
      409,
      "A donor with this email address already exits",
      "provide new email"
    );
  }

  const pendingRegistrationEmail = await tempModel.findOne({
    "data.email": email,
    type: "registration",
  });

  if (pendingRegistrationEmail) {
    throw new apiError(
      409,
      "Email pending verification for registration ",
      "Check your email to verify"
    );
  }

  const pendingEmailChangeEntry = await tempModel.findOne({
    "data.newEmail": email,
    type: "email_change",
  });

  if (pendingEmailChangeEntry) {
    throw new apiError(
      409,
      "Email pending verification for an update",
      " This email is currently undergoing a chnage verification"
    );
  }

  const verificationToken = jwt.sign(
    { email, fullName },
    process.env.JWT_SECRET,
    {
      expiresIn: "30m",
    }
  );

  const temp = await tempModel.create({
    type: "registration",
    data: {
      fullName,
      age,
      bloodGroup,
      diseases: diseases || [],
      email,
      password,
      lastDonationDate,
    },
    token: verificationToken,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), //30 minutes
  });

  if (!temp) {
    throw new apiError(500, "Cant Create user", "error");
  }

  const verifyLink = `${process.env.BACKEND_URL}/api/donor/verifyEmail?token=${verificationToken}`;

  const mailBody = `
  <div style="font-family: Arial, sans-serif; max-width: 450px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="text-align: center; color: #d32f2f;">Blood Bank Email Verification</h2>
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Click below to verify your email:</p>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="${verifyLink}" style="padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
    </div>

    <p style="font-size: 13px; color: #555;">Link expires in 30 minutes.</p>
  </div>
`;

  const emailSent = await sendEmail(email, mailBody, "Email Verification");

  if (!emailSent) {
    await tempModel.findByIdAndDelete(temp._id);
    throw new apiError(
      500,
      "Registration initiated, but failed to send verification email",
      "Please try again or contact support"
    );
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        temp,
        "Donor has been register! Check your email to verify"
      )
    );
});

//email verification
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new apiError(404, "Token Not Found", "The Token Doesnt exists");
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("JWT Verification Error (registraition):", err.message);
    throw new apiError(
      401,
      "Invalid or Expired Token",
      "Try registering again"
    );
  }

  //finding temporary Document using valid token
  const tempDoc = await tempModel.findOne({
    token: token,
    type: "registration",
    expiresAt: { $gt: Date.now() },
  });

  if (!tempDoc) {
    throw new apiError(
      404,
      "Token Expired",
      "The Token doesen't exists or expired"
    );
  }

  const existingDonor = await donorModel.findOne({
    email: tempDoc.data.email,
  });

  if (existingDonor) {
    await tempModel.findOneAndDelete({ _id: temp._id }); // clean up temp record
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Email already verified. You can now log in.")
      );
  }

  const donor = await donorModel.create({
    ...tempDoc.data,
    isEmailVerified: true,
  });

  if (!donor) {
    throw new apiError(
      500,
      "Error Registering",
      "Error Trying To Register donor"
    );
  }

  await tempModel.findOneAndDelete({ _id: tempDoc._id });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { donorId: donor._id, email: donor.email },
        "registeration complete"
      )
    );
});

//donor login
export const donorLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new apiError(
      400,
      "Email and password is requires",
      "Provide email and password"
    );
  }

  const donor = await donorModel.findOne({ email }).select("+password");

  if (!donor) {
    throw new apiError(404, "No donor found with this email", "create account");
  }

  if (!donor.isEmailVerified) {
    throw new apiError(
      403,
      "email is not verified",
      "please check  your inbox"
    );
  }

  //checking valid password
  const isPasswordValid = await donor.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(403, "Invalid credentails", "provide password");
  }

  const accessToken = await donor.generateAccessToken();
  const refreshToken = await donor.generateRefreshToken();
  donor.refreshToken = refreshToken;
  await donor.save({ validateBeforeSave: false });

  // const loggedInDonor = await donorModel
  //   .findById(donor._id)
  //   .select("-password -refreshToken");

  const loggedInDonor = {
    _id: donor._id,
    name: donor.fullName,
    email: donor.email,
    role: donor.role,
  };

  const options = {
    httpOnly: true,
    secure: (process.env.NODE_ENV = "production"),
    sameSite: "Lax",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { donor: loggedInDonor, accessToken },
        "Donor logged in successfully"
      )
    );
});

//donor logout
export const donorLogoutController = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await donorModel.findByIdAndUpdate(
    userId,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, " successfully logout"));
});

//Donation request management

export const donationRequestController = asyncHandler(async (req, res) => {
  const { units, disease } = req.body;
  console.log("Body", req.body);
  const donorId = req.user._id;
  console.log(donorId);

  if (!units || units < 0) {
    throw new apiError(
      400,
      "postive unit are required for a dontaion request",
      " provide units"
    );
  }

  const newDonationRequest = await donationReqsModel.create({
    donorId,
    unit: units,
    disease: disease || [],
    status: "Pending",
  });
  console.log("newDonation", newDonationRequest);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newDonationRequest,
        "Donation request submitted successfully"
      )
    );
});

//Donation History
export const getDonoationHistory = asyncHandler(async (req, res) => {
  const donorId = req.user._id;
  const donationRequests = await donationReqsModel
    .find({ donorId: donorId })
    .sort({ createdAt: -1 });

  if (!donationRequests || donationRequests.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          [],
          "No blood donation requests found for this donor."
        )
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        donationRequests,
        "Blood donation request history fetched successfully"
      )
    );
});

//requesting blood as donor Model
export const requestBloodAsDonor = asyncHandler(async (req, res) => {
  const { bloodGroup, unit } = req.body;
  const donorId = req.user._id;

  if (!bloodGroup || !unit || unit < 0) {
    throw new apiError(
      400,
      "blood group and blood units are positive",
      " provide blood Group and unit"
    );
  }

  const donorExists = await donorModel.findById(donorId);

  if (!donorExists) {
    throw new apiError(404, "Donor not Found", "Proved Exsting Donor");
  }

  const newBloodRequest = await bloodReqModel.create({
    requesterId: donorId,
    requesterType: "donor",
    bloodGroup,
    unit,
    status: "Pending",
  });
  console.log(newBloodRequest);

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        newBloodRequest,
        "Blood request submitted successfully"
      )
    );
});

//bloodRequest History
export const getBloodRequestHistroy = asyncHandler(async (req, res) => {
  const donorId = req.user._id;

  const bloodRequestHistory = await bloodReqModel
    .find({
      requesterId: donorId,
      requesterType: "donor",
    })
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bloodRequestHistory,
        "Blood donation request history fetched successfully"
      )
    );
});

//vewing profile
export const getDonorProfile = asyncHandler(async (req, res) => {
  const donorId = req.user._id;

  const donorProfile = await donorModel
    .findById(donorId)
    .select("-password -refreshToken");

  if (!donorProfile) {
    throw new apiError(404, "donor profile not found", "donor doesnot exits");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, donorProfile, "Patient profile fetched successfully")
    );
});

//updating donor profile
export const updateDonorProfile = asyncHandler(async (req, res) => {
  const donorId = req.user._id;
  const { fullName, age, email } = req.body;

  const donor = await donorModel.findById(donorId);

  if (!donor) {
    console.error("Donor is not found in DB");
    throw new apiError(404, "Donor account not found", "Donor does not exist");
  }

  //basic validation for update

  if (fullName && fullName.trim() === "") {
    throw new apiError(400, "Full name cannot be empty.", "Invalid full name");
  }

  if (age !== undefined && (typeof age !== "number" || age <= 0 || age > 120)) {
    throw new apiError(
      400,
      "Age must be vali number between 1 and 120",
      "Invalid age"
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new apiError(
      400,
      "Please provide a valid email address.",
      "Invalid Email Format"
    );
  }

  let nonEmailFieldsModified = false;
  let responseMessage =
    "Donor profile updated successfully (no email change requested";
  let newEmailPendingVerification = null;

  //update full name
  if (fullName && fullName !== donor.fullName) {
    donor.fullName = fullName;
    nonEmailFieldsModified = true;
  }

  //update age
  if (age && age !== donor.age) {
    donor.age = age;
    nonEmailFieldsModified = true;
  }

  const isEmailBeingChanged =
    email && email.toLowerCase() !== donor.email.toLowerCase();

  if (isEmailBeingChanged) {
    const newEmailLower = email.toLowerCase();

    //1.
    const existingDonorWithNewEmail = await donorModel.findOne({
      email: newEmailLower,
    });

    if (
      existingDonorWithNewEmail &&
      existingDonorWithNewEmail._id.toString() !== donorId.toString()
    ) {
      throw new apiError(
        409,
        "This email is already registered to another donor",
        "Email in used by donor"
      );
    }

    //2.
    const existingPatientWithNewEmail = await patientModel.findOne({
      email: newEmailLower,
    });
    if (existingPatientWithNewEmail) {
      throw new apiError(
        409,
        "This email is already registered to a patient",
        "Email in used by patient "
      );
    }

    //3.
    const existingPendingRegistration = await tempModel.findOne({
      "data.email": newEmailLower,
      type: "registration",
    });

    if (existingPendingRegistration) {
      throw new apiError(
        409,
        "This email is pending verification for a new account registratio. Please check your inbox",
        "Email Pending Registration"
      );
    }

    //4.
    const existingPendingEmailChange = await tempModel.findOne({
      "data.newEmail": newEmailLower,
      type: "email_change",
    });

    if (existingPendingEmailChange) {
      throw new apiError(
        409,
        "This email is already undergoing a change verification process for another account.Please check your inbox or wait for it to expire",
        "email pending change"
      );
    }

    //5.
    const existingPendingChangeForThisDonor = await tempModel.findOne({
      userId: donorId,
      userType: "donor",
      type: "email_change",
    });

    if (existingPendingChangeForThisDonor) {
      await tempModel.findByIdAndDelete(existingPendingChangeForThisDonor._id);
      console.log(
        `Overwriting existing pending email change record for patient ID: ${donorId}. Old temp ID: ${existingPendingChangeForThisDonor._id}`
      );
    }

    //generate token
    const plainToken = crypto.randomBytes(16).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

    //create temp model
    const tempEmailChangeDoc = await tempModel.create({
      type: "email_change",
      userId: donor._id,
      userType: "donor",
      data: {
        oldEmail: donor.email.toLowerCase(),
        newEmail: newEmailLower,
      },
      token: hashedToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    console.log(tempEmailChangeDoc);

    if (!tempEmailChangeDoc) {
      console.error("Failed to create tempEmailchangeDoc");
      throw new apiError(
        500,
        "Failed to create change request. Please try again",
        "server Error"
      );
    }

    const verificationUrl = `${process.env.BACKEND_URL}/api/donor/verify-new-email?token=${plainToken}&tempId=${tempEmailChangeDoc._id}`;

    const mailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="text-align: center; color: #dc3545;">Verify Your New Email Address for Your Blood Bank Account</h2>
        <p>Hi <strong>${donor.fullName}</strong>,</p>
        <p>You have recently requested to change your email address from <strong>${donor.email}</strong> to <strong>${newEmailLower}</strong> for your Blood Bank account.</p>
        <p>To confirm this change and activate your new email address, please click the link below:</p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${verificationUrl}" style="padding: 12px 25px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
            Verify New Email Address
          </a>
        </div>

        <p style="margin-top: 20px; font-size: 14px; color: #777;">
          This verification link is valid for 30 minutes. If you did not request this email change, please ignore this message. Your old email address will remain active until you verify the new one.
        </p>
        <p style="font-size: 14px; color: #777;">Thank you,</p>
        <p style="font-size: 14px; color: #777;">The Blood Bank Team</p>
      </div>
    `;

    const subject =
      "Action required: Verify your new email for blood bank account";

    const emailSent = await sendEmail(newEmailLower, mailBody, subject);

    if (!emailSent) {
      console.error(
        `Error sending verification email to ${newEmailLower} for donor ID ${donorId}.`
      );
      throw new apiError(
        500,
        "Profile updated (excluding email). Failed to send verification email to the new address. Please contact support.",
        "Email Send Failed"
      );
    } else {
      responseMessage =
        "Donor profile updated. Please check your new email to verify the address. until verified, you'll still log in with your old email";
      newEmailPendingVerification = newEmailLower;
    }
  } else {
    console.log(
      "Email was not changed or provided; skipping email change logic."
    );
  }

  if (!nonEmailFieldsModified) {
    responseMessage = "No changes detected. Donor profile remains the same.";
  }

  //save non-email field changes
  if (nonEmailFieldsModified) {
    await donor.save({ validateBeforeSave: true });
  } else {
    console.log("No non-email fields modified, skipping patient model save.");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      donor,
      newEmailPendingVerification: newEmailPendingVerification,
    })
  );
});

//New:Email verification for Profile updates...
export const verifyDonorNewEmail = asyncHandler(async (req, res) => {
  const { token, tempId } = req.query;

  if (!token || !tempId) {
    throw new apiError(
      400,
      "Missing Token or Temporary ID. Both are required for verification",
      "Missing Credentials"
    );
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const tempEmailChangeDoc = await tempModel.findOne({
    _id: tempId,
    token: hashedToken,
    type: "email_change",
    userType: "donor",
    expiresAt: { $gt: Date.now() },
  });

  if (!tempEmailChangeDoc) {
    throw new apiError(
      400,
      "Invalid or Expired Verification Link. This link may have been used, expired, or is invalid. Please try updating your email again to receive a new one.",
      "Link Invalid Or Expired"
    );
  }

  const donor = await donorModel.findById(tempEmailChangeDoc.userId);

  if (!donor) {
    console.warn(
      `Associated patient account not found for tempId ${tempId}. Cleaning up temp record.`
    );
    await tempModel.findByIdAndDelete(tempEmailChangeDoc._id);
    throw new apiError(
      404,
      "Associated patient account not found. Please contact support.",
      "Account Not Found"
    );
  }

  if (
    donor.email.toLowerCase() !== tempEmailChangeDoc.data.oldEmail.toLowerCase()
  ) {
    console.warn(
      `Email mismatch for patient ${donor._id} during new email verification. Current: ${donor.email}, Old in temp: ${tempEmailChangeDoc.data.oldEmail}. Cleaning up temp record.`
    );

    await tempModel.findByIdAndDelete(tempEmailChangeDoc._id);
    throw new apiError(
      409,
      "Email mismatch or already changed. This verification link is no longer valid. Please try updating your email again if you wish to change it.",
      "Email Mismatch Or Already Changed"
    );
  }

  donor.email = tempEmailChangeDoc.data.newEmail;
  donor.isEmailVerified = true;
  await donor.save({ validateBeforeSave: true });
  await tempModel.findByIdAndDelete(tempEmailChangeDoc._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        userId: donor._id,
        newEmail: donor.email,
        isEmailVerified: donor.isEmailVerified,
      },
      "Your new email has been successfully verified! You can now log in with your new email address"
    )
  );
  //
});
