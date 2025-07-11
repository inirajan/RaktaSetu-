import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Container,
  Card,
  Form,
  Button as BootstrapButton,
  Alert,
  Spinner,
} from "react-bootstrap";
import Input from "../components/Input.jsx";
import { loginUser } from "../services/api.js";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("donor");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlRole = searchParams.get("role");
    if (urlRole && ["admin", "donor", "patient"].includes(urlRole)) {
      setRole(urlRole);
    } else {
      setRole("donor");
    }
    setError(null);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let credentials = {};
    if (role === "admin") {
      credentials = { username, password };
    } else {
      credentials = { email, password };
    }

    try {
      const response = await loginUser(role, credentials);

      const userData = response?.data?.[role];
      const accessToken = response?.data?.accessToken;

      if (!userData || !accessToken) {
        throw new Error(
          "Invalid login response: Missing user data or access token."
        );
      }

      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("accessToken", accessToken);

      window.dispatchEvent(new Event("storage"));

      if (role === "admin") {
        navigate("/admin/dashboard");
      } else if (role === "donor") {
        navigate("/donor/profile");
      } else if (role === "patient") {
        navigate("/patient/profile");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "Login failed. Please check your credentials.");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
    } finally {
      setLoading(false);
    }
  };
  console.log("1", handleSubmit);

  const loginTitle = `${role.charAt(0).toUpperCase() + role.slice(1)} Login`;
  console.log("2", loginTitle);

  return (
    <Container className="d-flex justify-content-center py-5">
      <Card
        className="shadow-lg p-4"
        style={{ maxWidth: "400px", width: "100%" }}
      >
        <Card.Body>
          <h2 className="text-center mb-4 text-dark">{loginTitle}</h2>

          <Form onSubmit={handleSubmit}>
            {role === "admin" ? (
              <Input
                label="Username"
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
              />
            ) : (
              <Input
                label="Email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            )}
            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />

            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}

            <BootstrapButton
              variant="primary"
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
                "Login"
              )}
            </BootstrapButton>

            {role !== "admin" && (
              <p className="text-center mt-3 text-secondary">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary">
                  Register here
                </Link>
              </p>
            )}
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LoginPage;
