import React, { useEffect, useState } from "react";
import {
  getPatientProfile,
  updatePatientProfile,
  getPatientDashboardStats,
  requestBloodAsPatient,
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

const PatientProfilePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    email: "",
  });
  const [updateMessage, setUpdateMessage] = useState(null);
  const [bloodRequestGroup, setBloodRequestGroup] = useState("");
  const [bloodRequestUnit, setBloodRequestUnit] = useState("");
  const [bloodRequestMessage, setBloodRequestMessage] = useState(null);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedAccessToken = localStorage.getItem("accessToken");

    if (!storedUser || !storedAccessToken) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "patient") {
        navigate("/");
        return;
      }
      setCurrentUser(parsedUser);
    } catch (parseError) {
      console.error("Failed to parse stored user:", parseError);
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchProfileAndDashboard();
    }
  }, [currentUser]);

  const fetchProfileAndDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, dashboardRes] = await Promise.all([
        getPatientProfile(),
        getPatientDashboardStats(),
      ]);
      setProfile(profileRes.data);
      setDashboardStats(dashboardRes.data);
      setFormData({
        fullName: profileRes.data.fullName,
        age: profileRes.data.age,
        email: profileRes.data.email,
      });
    } catch (err) {
      setError(err.message || "Failed to fetch patient data.");
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
      const updatedData = {
        fullName: formData.fullName,
        age: parseInt(formData.age),
        email: formData.email,
      };
      const response = await updatePatientProfile(updatedData);

      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      setProfile(response.data);
      setUpdateMessage(response.message || "Profile updated successfully!");
      if (response.data.newEmailPendingVerification) {
        setUpdateMessage(
          (prev) => prev + " Please verify your new email address."
        );
      }
      setEditMode(false);
    } catch (err) {
      setUpdateMessage(err.message || "Failed to update profile.");
    }
  };

  const handleBloodRequest = async (e) => {
    e.preventDefault();
    setBloodRequestMessage(null);
    try {
      const unit = parseInt(bloodRequestUnit);
      if (isNaN(unit) || unit <= 0) {
        setBloodRequestMessage("Please enter a valid number of units.");
        return;
      }
      const response = await requestBloodAsPatient(bloodRequestGroup, unit);
      setBloodRequestMessage(
        response.message || "Blood request submitted successfully!"
      );
      setBloodRequestGroup("");
      setBloodRequestUnit("");
      fetchProfileAndDashboard();
    } catch (err) {
      setBloodRequestMessage(err.message || "Failed to submit blood request.");
    }
  };

  if (loading || !currentUser)
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
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
      <h1 className="text-danger mb-4">Patient Dashboard & Profile</h1>

      {/* Dashboard Cards */}
      {dashboardStats && (
        <Card className="shadow-sm mb-4">
          <Card.Body>
            <Card.Title className="text-secondary mb-3">
              Your Request Summary
            </Card.Title>
            <Row className="g-4">
              {[
                {
                  label: "Total",
                  value: dashboardStats.totalRequestMade,
                  bg: "info",
                  text: "white",
                },
                {
                  label: "Approved",
                  value: dashboardStats.approvedRequest,
                  bg: "success",
                  text: "white",
                },
                {
                  label: "Pending",
                  value: dashboardStats.pendingRequest,
                  bg: "warning",
                  text: "dark",
                },
                {
                  label: "Rejected",
                  value: dashboardStats.rejectedRequest,
                  bg: "danger",
                  text: "white",
                },
              ].map((item, idx) => (
                <Col key={idx} xs={12} md={6} lg={3}>
                  <Card
                    bg={item.bg}
                    text={item.text}
                    className="h-100 text-center"
                  >
                    <Card.Body>
                      <Card.Title>{item.label} Requests</Card.Title>
                      <Card.Text className="fs-1 fw-bold">
                        {item.value}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      <hr className="my-4" />

      {/* Profile Section */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-secondary mb-3">Your Profile</Card.Title>
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
            <>
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
                {profile.disease?.join(", ") || "None"}
              </p>
              <BootstrapButton
                variant="primary"
                onClick={() => setEditMode(true)}
                className="mt-3"
              >
                Edit Profile
              </BootstrapButton>
            </>
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

      {/* Blood Request Form */}
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
              label="Units (in ml)"
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
    </Container>
  );
};

export default PatientProfilePage;
