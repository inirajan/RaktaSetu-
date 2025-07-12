import { asyncHandler } from "../utils/asyncHandler.util.js";
import { ApiResponse } from "../utils/apiResponse.util.js";
import { patientModel } from "../models/patient.model.js";
import { apiError } from "../utils/apiError.util.js";
import { tempModel } from "../models/temp.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.utils.js";
import { bloodReqModel } from "../models/bloodReq.model.js";
import crypto from "crypto";
import { donorModel } from "../models/donor.model.js";

export const patientRegisterControl = asyncHandler(async (req, res) => {
  const { fullName, age, bloodGroup, disease, email, password } = req.body;
  console.log("patient", req.body);

  //basic validation
  if (!fullName || !age || !bloodGroup || !email || !password) {
    throw new apiError(400, "Provide all fields", "Empty Field");
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
    // Basic password length check
    throw new apiError(
      400,
      "Password must be at least 8 characters long.",
      "Password Too Short"
    );
  }

  const exstingPatient = await patientModel.findOne({ email });
  if (exstingPatient) {
    throw new apiError(
      409,
      "A patient with this email address already exists",
      "Provide new email"
    );
  }

  //checking if email is pending
  const pendingRegistrationEmail = await tempModel.findOne({
    "data.email": email,
    type: "registration",
  });

  if (pendingRegistrationEmail) {
    throw new apiError(
      409,
      "Email pending verification for registration",
      "Check your email to verify"
    );
  }

  // Also check if email is pending an update for a donor or patient
  const pendingEmailChangeEntry = await tempModel.findOne({
    "data.newEmail": email,
    type: "email_change",
  });

  if (pendingEmailChangeEntry) {
    throw new apiError(
      409,
      "Email pending verification for an update",
      "This email is currently undergoing a change verification."
    );
  }

  const verificationToken = jwt.sign(
    { email, fullName },
    process.env.JWT_SECRET,
    {
      expiresIn: "30m",
    }
  );

  //save data to temp storage
  const temp = await tempModel.create({
    type: "registration",
    data: {
      fullName,
      age,
      bloodGroup,
      disease: disease || [],
      email,
      password,
    },
    token: verificationToken,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  });

  if (!temp) {
    throw new apiError(500, "Can't Create user", "error");
  }

  //verify email
  const verifyLink = `${process.env.BACKEND_URL}/api/patient/verifyEmail?token=${verificationToken}`;

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

    <p style="font-size: 13px; color: #555;">Link expires in 30   minutes.</p>
  </div>
`;

  const emailSent = await sendEmail(email, mailBody, "Email Verification");

  if (!emailSent) {
    //   console.error(
    //     `Failed to send verification email to ${emailSent} during registration.`
    //   );
    await tempModel.findByIdAndDelete(temp._id); // Clean up temp record on email send failure
    throw new apiError(
      500,
      "Registration initiated, but failed to send verification email.",
      "Please try again or contact support."
    );
  }

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        temp,
        "Patient has been registered! Check your email to verify"
      )
    );
});

//email verificationS
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new apiError(404, "Token Not Found", "The Token Doesn't exist");
  }

  let decoded;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("JWT Verification Error (Registration):", err.message);
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
      "Verification Link Used or Expired",
      "The verification link has already been used, is invalid, or has expired."
    );
  }

  const existingPatient = await patientModel.findOne({
    email: tempDoc.data.email,
  });

  if (existingPatient) {
    await tempModel.findOneAndDelete({ _id: tempDoc._id }); // Clean up temp record
    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Email already verified. You can now log in.")
      );
  }

  const patient = await patientModel.create({
    ...tempDoc.data,
    isEmailVerified: true,
    role: "patient",
  });

  if (!patient) {
    throw new apiError(
      500,
      "Error Registering",
      "Error Trying To Register patient"
    );
  }

  await tempModel.findOneAndDelete({ _id: tempDoc._id });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { patientId: patient._id, email: patient.email },
        "Registration complete"
      )
    );
});

//patient Login
export const patientLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log("patient login", req.body);
  if (!email || !password) {
    throw new apiError(
      400,
      "Email and password are required",
      "Provide email and password"
    );
  }

  const patient = await patientModel.findOne({ email }).select("+password");

  if (!patient) {
    throw new apiError(
      404,
      "No patient found with this email",
      "create account"
    );
  }

  if (!patient.isEmailVerified) {
    throw new apiError(403, "Email is not verified", "Please check your inbox");
  }

  const isPasswordValid = await patient.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(403, "Invalid credentials", "Provide password");
  }

  const accessToken = await patient.generateAccessToken();
  const refreshToken = await patient.generateRefreshToken();
  patient.refreshToken = refreshToken;
  await patient.save({ validateBeforeSave: false });

  const loggedInPatient = {
    _id: patient._id,
    fullName: patient.fullName,
    email: patient.email,
    role: patient.role,
  };

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { patient: loggedInPatient, accessToken },
        "Logged in successfully"
      )
    );
});

//patient logout
export const patientLogoutController = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await patientModel.findByIdAndUpdate(
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
    .json(new ApiResponse(200, {}, "Logout Successfully"));
});

//request dashboard management
export const getPatientDashboard = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const totalRequestMade = await bloodReqModel.countDocuments({
    requesterId: patientId,
    requesterType: "patient",
  });

  const approvedRequest = await bloodReqModel.countDocuments({
    requesterId: patientId,
    requesterType: "patient",
    status: "Approved",
  });

  const pendingRequest = await bloodReqModel.countDocuments({
    requesterId: patientId,
    requesterType: "patient",
    status: "Pending",
  });

  const rejectedRequest = await bloodReqModel.countDocuments({
    requesterId: patientId,
    requesterType: "patient",
    status: "Rejected",
  });

  const dashbordData = {
    totalRequestMade,
    approvedRequest,
    pendingRequest,
    rejectedRequest,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dashbordData,
        "Patient dashboard data fetched successfully"
      )
    );
});

// blood request
export const requestBloodAsPatient = asyncHandler(async (req, res) => {
  const { bloodGroup, unit } = req.body;
  const patientId = req.user._id;

  // Basic validation for blood request
  if (!bloodGroup || !unit || unit <= 0) {
    throw new apiError(
      400,
      "Blood group and unit are required for a blood request.",
      "MissingFields"
    );
  }
  const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (!validBloodGroups.includes(bloodGroup)) {
    throw new apiError(
      400,
      "Invalid blood group provided.",
      "InvalidBloodGroup"
    );
  }
  if (typeof unit !== "number" || unit <= 0) {
    throw new apiError(400, "Unit must be a positive number.", "InvalidUnit");
  }

  const newBloodRequest = await bloodReqModel.create({
    requesterId: patientId,
    requesterType: "patient",
    bloodGroup,
    unit,
    status: "Pending",
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        newBloodRequest,
        "Blood request submitted successfully and is pending approval."
      )
    );
});

//patient History
export const getBloodRequestHistroyAsPatient = asyncHandler(
  async (req, res) => {
    const patientId = req.user._id;

    const bloodRequest = await bloodReqModel
      .find({ requesterId: patientId, requesterType: "patient" })
      .sort({ createdAt: -1 });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          bloodRequest,
          "My blood request history fetched successfully"
        )
      );
  }
);

//vewing patient profile
export const getPatientProflie = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const patientProfile = await patientModel
    .findById(patientId)
    .select("-password -refreshToken");

  if (!patientProfile) {
    throw new apiError(
      404,
      "Patient profile not found",
      "Patient does not exist"
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        patientProfile,
        "Patient profile fetched successfully"
      )
    );
});

//updating patient profile
export const updatePatientProfile = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const { fullName, age, email } = req.body;

  console.log("Patient ID from token:", patientId);

  const patient = await patientModel.findById(patientId);

  if (!patient) {
    console.error("Patient not found in DB.");
    throw new apiError(
      404,
      "Patient account not found.",
      "Patient Does Not Exist"
    );
  }

  console.log("Current Patient Email from DB:", patient.email);

  // Basic validation for update (allowing partial updates)
  if (fullName && fullName.trim() === "") {
    throw new apiError(400, "Full name cannot be empty.", "Invalid Full Name");
  }

  if (age !== undefined && (typeof age !== "number" || age <= 0 || age > 120)) {
    throw new apiError(
      400,
      "Age must be a valid number between 1 and 120.",
      "Invalid Age"
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
    "Patient profile updated successfully (no email change requested)."; // Default message updated
  let newEmailPendingVerification = null;

  // Update full name
  if (fullName && fullName !== patient.fullName) {
    patient.fullName = fullName;
    nonEmailFieldsModified = true;
  }

  // Update age
  if (age && age !== patient.age) {
    patient.age = age;
    nonEmailFieldsModified = true;
  }
  const isEmailBeingChanged =
    email && email.toLowerCase() !== patient.email.toLowerCase();

  if (isEmailBeingChanged) {
    const newEmailLower = email.toLowerCase();

    // 1. Check verified patient
    const existingPatientWithNewEmail = await patientModel.findOne({
      email: newEmailLower,
    });
    if (
      existingPatientWithNewEmail &&
      existingPatientWithNewEmail._id.toString() !== patientId.toString()
    ) {
      throw new apiError(
        409,
        "This email is already registered to another patient.",
        "Email In Use By Patient"
      );
    }

    // 2. Check verified donor
    const existingDonorWithNewEmail = await donorModel.findOne({
      email: newEmailLower,
    });
    if (existingDonorWithNewEmail) {
      throw new apiError(
        409,
        "This email is already registered to a donor.",
        "Email In Use By Donor"
      );
    }

    // 3. Check pending registration
    const existingPendingRegistration = await tempModel.findOne({
      "data.email": newEmailLower,
      type: "registration",
    });
    if (existingPendingRegistration) {
      throw new apiError(
        409,
        "This email is pending verification for a new account registration. Please check your inbox.",
        "Email Pending Registration"
      );
    }

    // 4. Check pending email change
    const existingPendingEmailChange = await tempModel.findOne({
      "data.newEmail": newEmailLower,
      type: "email_change",
    });
    if (existingPendingEmailChange) {
      throw new apiError(
        409,
        "This email is already undergoing a change verification process for another account. Please check your inbox or wait for it to expire.",
        "Email Pending Change"
      );
    }

    // 5. Handle existing pending email change for THIS patient
    const existingPendingChangeForThisPatient = await tempModel.findOne({
      userId: patientId,
      userType: "patient",
      type: "email_change",
    });
    if (existingPendingChangeForThisPatient) {
      await tempModel.findByIdAndDelete(
        existingPendingChangeForThisPatient._id
      );
      console.log(
        `Overwriting existing pending email change record for patient ID: ${patientId}. Old temp ID: ${existingPendingChangeForThisPatient._id}`
      );
    } else {
      console.log(
        "No existing pending email change for this patient to overwrite."
      );
    }

    // Generate token
    const plainToken = crypto.randomBytes(16).toString("hex"); // Stronger token
    const hashedToken = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

    // Create tempModel document
    const tempEmailChangeDoc = await tempModel.create({
      type: "email_change",
      userId: patient._id,
      userType: "patient",
      data: {
        oldEmail: patient.email.toLowerCase(),
        newEmail: newEmailLower,
      },
      token: hashedToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    if (!tempEmailChangeDoc) {
      console.error("Failed to create tempEmailChangeDoc.");
      throw new apiError(
        500,
        "Failed to create email change request. Please try again.",
        "Server Error"
      );
    }

    const verificationUrl = `${process.env.BACKEND_URL}/api/patient/verify-new-email?token=${plainToken}&tempId=${tempEmailChangeDoc._id}`;

    const mailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="text-align: center; color: #dc3545;">Verify Your New Email Address for Your Blood Bank Account</h2>
        <p>Hi <strong>${patient.fullName}</strong>,</p>
        <p>You have recently requested to change your email address from <strong>${patient.email}</strong> to <strong>${newEmailLower}</strong> for your Blood Bank account.</p>
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
      "Action Required: Verify Your New Email for Blood Bank Account";

    const emailSent = await sendEmail(newEmailLower, mailBody, subject);

    if (!emailSent) {
      console.error(
        `Error sending verification email to ${newEmailLower} for patient ID ${patientId}.`
      );
      await tempModel.findByIdAndDelete(tempEmailChangeDoc._id);
      throw new apiError(
        500,
        "Profile updated (excluding email). Failed to send verification email to the new address. Please contact support.",
        "Email Send Failed"
      );
    } else {
      responseMessage =
        "Patient profile updated. Please check your new email to verify the address. Until verified, you'll still log in with your old email.";
      newEmailPendingVerification = newEmailLower;
    }
  } else {
    console.log(
      "Email was not changed or provided; skipping email change logic."
    );
    if (!nonEmailFieldsModified) {
      responseMessage =
        "No changes detected. Patient profile remains the same.";
    }
  }

  // Save non-email field changes
  if (nonEmailFieldsModified) {
    await patient.save({ validateBeforeSave: true });
  } else {
    console.log("No non-email fields modified, skipping patient model save.");
  }

  const responseData = {
    _id: patient._id,
    fullName: patient.fullName,
    age: patient.age,
    bloodGroup: patient.bloodGroup,
    email: patient.email,
    isEmailVerified: patient.isEmailVerified,
    newEmailPendingVerification: newEmailPendingVerification,
    currentVerifiedEmail: patient.email,
    disease: patient.disease,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, responseData, responseMessage));
});

//  NEW: Email Verification for Profile Updates ---
export const verifyPatientNewEmail = asyncHandler(async (req, res) => {
  const { token, tempId } = req.query;
  console.log("q", req.query);

  if (!token || !tempId) {
    throw new apiError(
      400,
      "Missing Token or Temporary ID. Both are required for verification",
      "Missing Credentials"
    );
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  console.log(hashedToken);

  const tempEmailChangeDoc = await tempModel.findOne({
    _id: tempId,
    token: hashedToken,
    type: "email_change",
    userType: "patient",
    expiresAt: { $gt: Date.now() },
  });

  console.log("new", tempEmailChangeDoc);
  if (!tempEmailChangeDoc) {
    throw new apiError(
      400,
      "Invalid or Expired Verification Link. This link may have been used, expired, or is invalid. Please try updating your email again to receive a new one.",
      "Link Invalid Or Expired"
    );
  }

  // Find the actual patient whose email is being updated
  const patient = await patientModel.findById(tempEmailChangeDoc.userId);
  console.log(patient);

  // If the associated patient account is not found (e.g., deleted), clean up the temp record
  if (!patient) {
    console.warn(
      `Associated patient account not found for tempId ${tempId}. Cleaning up temp record.`
    );
    await tempModel.findByIdAndDelete(tempEmailChangeDoc._id);
    throw new apiError(
      404,
      "Associated patient account not found. Please contact support.",
      "Account Not sFound"
    );
  }

  if (
    patient.email.toLowerCase() !==
    tempEmailChangeDoc.data.oldEmail.toLowerCase()
  ) {
    console.warn(
      `Email mismatch for patient ${patient._id} during new email verification. Current: ${patient.email}, Old in temp: ${tempEmailChangeDoc.data.oldEmail}. Cleaning up temp record.`
    );
    // If mismatch, invalidate this pending doc and inform the user
    await tempModel.findByIdAndDelete(tempEmailChangeDoc._id);
    throw new apiError(
      409,
      "Email mismatch or already changed. This verification link is no longer valid. Please try updating your email again if you wish to change it.",
      "Email Mismatch Or Already Changed"
    );
  }

  // Now, update the patient's email in the patientModel and mark it as verified
  patient.email = tempEmailChangeDoc.data.newEmail;
  patient.isEmailVerified = true;
  await patient.save({ validateBeforeSave: true });

  // Delete the temporary email change document upon successful verification
  await tempModel.findByIdAndDelete(tempEmailChangeDoc._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        userId: patient._id,
        newEmail: patient.email,
        isEmailVerified: patient.isEmailVerified,
      },
      "Your new email has been successfully verified! You can now log in with your new email address"
    )
  );
});
