import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Card,
  Form,
  Button as BootstrapButton,
  Alert,
  Spinner,
  InputGroup,
} from "react-bootstrap";
import Input from "../components/Input.jsx";
import { registerUser } from "../services/api.js";

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [diseases, setDiseases] = useState("");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [role, setRole] = useState("donor");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const userData = {
      fullName,
      email,
      password,
      age: parseInt(age),
      bloodGroup,
      diseases: diseases
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d),
    };

    if (role === "donor" && lastDonationDate) {
      userData.lastDonationDate = lastDonationDate;
    } else if (role === "patient") {
      userData.disease = userData.diseases;
      delete userData.diseases;
    }

    try {
      const response = await registerUser(role, userData);
      setMessage(
        response.message ||
          "Registration successful! Please check your email for verification."
      );
      setTimeout(() => navigate(`/login?role=${role}`), 3000);
    } catch (err) {
      console.error("Registration failed:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card
        className="shadow-lg p-4"
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <Card.Body>
          <h2 className="text-center mb-4 text-dark">Register New Account</h2>

          <Form.Group className="mb-3">
            <Form.Label>Register As:</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="Donor"
                name="role"
                value="donor"
                checked={role === "donor"}
                onChange={() => {
                  setRole("donor");
                  setLastDonationDate("");
                }}
                id="radio-donor"
              />
              <Form.Check
                inline
                type="radio"
                label="Patient"
                name="role"
                value="patient"
                checked={role === "patient"}
                onChange={() => {
                  setRole("patient");
                  setLastDonationDate("");
                }}
                id="radio-patient"
              />
            </div>
          </Form.Group>

          <Form onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="full name"
              required
            />
            <Input
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />

            <Form.Group className="mb-3">
              <Form.Label htmlFor="password">Password</Form.Label>
              <InputGroup>
                <Form.Control
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                />
                <BootstrapButton
                  variant="outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </BootstrapButton>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="confirmPassword">
                Confirm Password
              </Form.Label>
              <InputGroup>
                <Form.Control
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  required
                />
                <BootstrapButton
                  variant="outline-secondary"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </BootstrapButton>
              </InputGroup>
            </Form.Group>

            <Input
              label="Age"
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="20"
              min="1"
              max="120"
              required
            />
            <Form.Group className="mb-3">
              <Form.Label htmlFor="bloodGroup">Blood Group</Form.Label>
              <Form.Select
                id="bloodGroup"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
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

            {role === "donor" && (
              <Input
                label="Last Donation Date (if applicable)"
                id="lastDonationDate"
                type="date"
                value={lastDonationDate}
                onChange={(e) => setLastDonationDate(e.target.value)}
              />
            )}

            <Input
              label={`Diseases (comma separated, e.g., ${
                role === "donor" ? "None, Diabetes" : "Malaria, Typhoid"
              })`}
              id="diseases"
              type="text"
              value={diseases}
              onChange={(e) => setDiseases(e.target.value)}
              placeholder={`e.g., ${
                role === "donor" ? "None, Diabetes" : "Malaria, Typhoid"
              }`}
            />

            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}
            {message && (
              <Alert variant="success" className="mt-3">
                {message}
              </Alert>
            )}

            <BootstrapButton
              variant="danger"
              type="submit"
              className="w-100 mt-3"
              disabled={loading}
            >
              {loading ? (
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
              ) : (
                "Register"
              )}
            </BootstrapButton>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RegisterPage;
