import React, { useEffect, useState } from "react";
import {
  getDonorProfile,
  updateDonorProfile,
  requestDonation,
  requestBloodAsDonor,
} from "../services/api.js";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button as BootstrapButton,
  Spinner,
  Alert,
} from "react-bootstrap";
import Input from "../components/Input.jsx";

const DonorProfilePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    email: "",
  });
  const [updateMessage, setUpdateMessage] = useState(null);

  const [donationUnits, setDonationUnits] = useState("");
  const [donationDiseases, setDonationDiseases] = useState("");
  const [donationMessage, setDonationMessage] = useState(null);

  const [bloodRequestGroup, setBloodRequestGroup] = useState("");
  const [bloodRequestUnit, setBloodRequestUnit] = useState("");
  const [bloodRequestMessage, setBloodRequestMessage] = useState(null);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedAccessToken = localStorage.getItem("accessToken");

    if (!storedUser || !storedAccessToken) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "donor") {
        navigate("/");
        return;
      }
      setCurrentUser(parsedUser);
    } catch (parseError) {
      console.error("Failed to parse stored user:", parseError);
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      navigate("/login");
      return;
    }
    fetchProfile(); // Only fetch profile here
  }, [navigate]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDonorProfile();
      setProfile(response.data);
      setFormData({
        fullName: response.data.fullName,
        age: response.data.age,
        email: response.data.email,
      });
    } catch (err) {
      setError(err.message || "Failed to fetch donor profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdateMessage(null);
    try {
      const dataToSend = {
        fullName: formData.fullName,
        age: parseInt(formData.age),
        email: formData.email,
      };
      const response = await updateDonorProfile(dataToSend);
      const updatedUserInStorage = { ...currentUser, ...response.data };
      localStorage.setItem("user", JSON.stringify(updatedUserInStorage));
      setCurrentUser(updatedUserInStorage);

      setProfile(response.data);
      setUpdateMessage(response.message || "Profile updated successfully!");
      if (response.data.newEmailPendingVerification) {
        setUpdateMessage(
          (prev) => prev + " Please check your new email for verification."
        );
      }
      setEditMode(false);
    } catch (err) {
      setUpdateMessage(err.message || "Failed to update profile.");
    }
  };

  const handleDonationRequest = async (e) => {
    e.preventDefault();
    setDonationMessage(null);
    try {
      const units = parseInt(donationUnits);
      if (isNaN(units) || units <= 0) {
        setDonationMessage("Please enter a positive number for units.");
        return;
      }
      const diseasesArray = donationDiseases
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d);
      const response = await requestDonation(units, diseasesArray);
      setDonationMessage(
        response.message || "Donation request submitted successfully!"
      );
      setDonationUnits("");
      setDonationDiseases("");
    } catch (err) {
      setDonationMessage(err.message || "Failed to submit donation request.");
    }
  };

  const handleBloodRequest = async (e) => {
    e.preventDefault();
    setBloodRequestMessage(null);
    try {
      const unit = parseInt(bloodRequestUnit);
      if (isNaN(unit) || unit <= 0) {
        setBloodRequestMessage("Please enter a positive number for units.");
        return;
      }
      const response = await requestBloodAsDonor(bloodRequestGroup, unit);
      setBloodRequestMessage(
        response.message || "Blood request submitted successfully!"
      );
      setBloodRequestGroup("");
      setBloodRequestUnit("");
    } catch (err) {
      setBloodRequestMessage(err.message || "Failed to submit blood request.");
    }
  };

  if (loading || !currentUser)
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Donor Profile...</span>
        </Spinner>
      </Container>
    );

  if (error)
    return (
      <Alert variant="danger" className="m-4">
        Error: {error}
      </Alert>
    );

  return (
    <Container className="py-4">
      <h1 className="text-danger mb-4">Donor Profile</h1>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-secondary mb-3">
            Your Information
          </Card.Title>
          {updateMessage && (
            <Alert
              variant={
                updateMessage.includes("successfully") ? "success" : "danger"
              }
              className="mt-3"
            >
              {updateMessage}
            </Alert>
          )}
          {!editMode ? (
            <div>
              <p>
                <strong>Full Name:</strong> {profile.fullName}
              </p>
              <p>
                <strong>Email:</strong> {profile.email}
              </p>
              <p>
                <strong>Age:</strong> {profile.age}
              </p>
              <p>
                <strong>Blood Group:</strong> {profile.bloodGroup}
              </p>
              <p>
                <strong>Diseases:</strong>{" "}
                {profile.diseases && profile.diseases.length > 0
                  ? profile.diseases.join(", ")
                  : "None"}
              </p>
              <p>
                <strong>Last Donation:</strong>{" "}
                {profile.lastDonationDate
                  ? new Date(profile.lastDonationDate).toLocaleDateString()
                  : "N/A"}
              </p>
              <BootstrapButton
                variant="primary"
                onClick={() => setEditMode(true)}
                className="mt-3"
              >
                Edit Profile
              </BootstrapButton>
            </div>
          ) : (
            <Form onSubmit={handleUpdateProfile}>
              <Input
                label="Full Name"
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleProfileChange}
                required
              />
              <Input
                label="Email"
                id="email"
                type="email"
                value={formData.email}
                onChange={handleProfileChange}
                required
              />
              <Input
                label="Age"
                id="age"
                type="number"
                value={formData.age}
                onChange={handleProfileChange}
                min="1"
                max="120"
                required
              />
              <div className="d-flex gap-2 mt-3">
                <BootstrapButton variant="primary" type="submit">
                  Save Changes
                </BootstrapButton>
                <BootstrapButton
                  variant="secondary"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </BootstrapButton>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>

      <hr className="my-4" />

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-secondary mb-3">
            Request a Donation
          </Card.Title>
          {donationMessage && (
            <Alert
              variant={
                donationMessage.includes("successfully") ? "success" : "danger"
              }
              className="mt-3"
            >
              {donationMessage}
            </Alert>
          )}
          <Form onSubmit={handleDonationRequest}>
            <Input
              label="Units to Donate (in ml/units, e.g., 450)"
              id="donationUnits"
              type="number"
              value={donationUnits}
              onChange={(e) => setDonationUnits(e.target.value)}
              placeholder="e.g., 450"
              min="1"
              required
            />
            <Input
              label="Any new diseases/conditions? (comma separated, e.g., None, Diabetes)"
              id="donationDiseases"
              type="text"
              value={donationDiseases}
              onChange={(e) => setDonationDiseases(e.target.value)}
              placeholder="None, Flu"
            />
            <BootstrapButton variant="danger" type="submit" className="mt-3">
              Submit Donation Request
            </BootstrapButton>
          </Form>
        </Card.Body>
      </Card>

      <hr className="my-4" />

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-secondary mb-3">Request Blood</Card.Title>
          {bloodRequestMessage && (
            <Alert
              variant={
                bloodRequestMessage.includes("successfully")
                  ? "success"
                  : "danger"
              }
              className="mt-3"
            >
              {bloodRequestMessage}
            </Alert>
          )}
          <Form onSubmit={handleBloodRequest}>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="bloodRequestGroup">Blood Group</Form.Label>
              <Form.Select
                id="bloodRequestGroup"
                value={bloodRequestGroup}
                onChange={(e) => setBloodRequestGroup(e.target.value)}
                required
              >
                <option value="">Select Blood Group</option>
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Input
              label="Units (in ml/units)"
              id="bloodRequestUnit"
              type="number"
              value={bloodRequestUnit}
              onChange={(e) => setBloodRequestUnit(e.target.value)}
              placeholder="e.g., 200"
              min="1"
              required
            />
            <BootstrapButton variant="danger" type="submit" className="mt-3">
              Submit Blood Request
            </BootstrapButton>
          </Form>
        </Card.Body>
      </Card>

      <hr className="my-4" />
    </Container>
  );
};

export default DonorProfilePage;
