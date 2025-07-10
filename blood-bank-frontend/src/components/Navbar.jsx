import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Navbar as BootstrapNavbar,
  Nav,
  Container,
  Button as BootstrapButton,
} from "react-bootstrap";
import { logoutUser } from "../services/api.js";
import "../styles/Navbar.css";

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem("user");
      const storedAccessToken = localStorage.getItem("accessToken");

      if (storedUser && storedAccessToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setIsAuthenticated(true);
          setUser(parsedUser);
          setRole(parsedUser.role);
        } catch (error) {
          console.error("Failed to parse stored user:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("patientStats");
          setIsAuthenticated(false);
          setUser(null);
          setRole(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setRole(null);
        localStorage.removeItem("patientStats");
      }
    };

    checkAuthStatus();
    window.addEventListener("storage", checkAuthStatus);

    return () => {
      window.removeEventListener("storage", checkAuthStatus);
    };
  }, []);

  const handleLogout = async () => {
    try {
      if (role) {
        await logoutUser(role);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("patientStats");
      setIsAuthenticated(false);
      setUser(null);
      setRole(null);
      navigate("/");
    }
  };

  return (
    <BootstrapNavbar bg="dark" variant="dark" expand="lg" className="shadow-lg">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/">
          <img
            src="/public/5-logo.png"
            alt="Blood Bank Logo"
            className="navbar-logo me-0"
          />
          RaktaSetu
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            {!isAuthenticated && (
              <Nav.Link
                as={Link}
                to="/"
                className="nav-link-with-icon home-link"
              >
                <img
                  src="/public/1-home.png"
                  alt="Home Icon"
                  className="navbar-icon me-2"
                />
                Home
              </Nav.Link>
            )}

            {!isAuthenticated && (
              <>
                <Nav.Link
                  as={Link}
                  to="/login?role=admin"
                  className="nav-link-with-icon admin-link"
                >
                  <img
                    src="/public/2-admin.png"
                    alt="Admin Icon"
                    className="navbar-icon me-2"
                  />
                  Admin
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/login?role=donor"
                  className="nav-link-with-icon donor-link"
                >
                  <img
                    src="/public/3-donor.png"
                    alt="Donor Icon"
                    className="navbar-icon me-2"
                  />
                  Donor
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/login?role=patient"
                  className="nav-link-with-icon patient-link"
                >
                  <img
                    src="/public/4-patient.png"
                    alt="Patient Icon"
                    className="navbar-icon me-2"
                  />
                  Patient
                </Nav.Link>
              </>
            )}

            {isAuthenticated && user && (
              <>
                <span className="navbar-text me-3 text-white">
                  Welcome, {user.fullName || user.username || "User"}
                </span>

                {role === "admin" && (
                  <Nav.Link
                    as={Link}
                    to="/admin/dashboard"
                    className="nav-link-with-icon admin-link"
                  >
                    Dashboard
                  </Nav.Link>
                )}
                {role === "donor" && (
                  <>
                    <Nav.Link
                      as={Link}
                      to="/donor/profile"
                      className="nav-link-with-icon donor-link"
                    >
                      Profile
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/donor/donations"
                      className="nav-link-with-icon donor-link"
                    >
                      My Donations
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/donor/blood-requests"
                      className="nav-link-with-icon donor-link"
                    >
                      My Blood Requests
                    </Nav.Link>
                  </>
                )}
                {role === "patient" && (
                  <>
                    <Nav.Link
                      as={Link}
                      to="/patient/profile"
                      className="nav-link-with-icon patient-link"
                    >
                      Profile
                    </Nav.Link>

                    <Nav.Link
                      as={Link}
                      to="/patient/blood-requests"
                      className="nav-link-with-icon patient-link"
                    >
                      My Blood Requests
                    </Nav.Link>
                  </>
                )}

                <BootstrapButton
                  variant="danger"
                  onClick={handleLogout}
                  size="sm"
                >
                  Logout
                </BootstrapButton>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;
