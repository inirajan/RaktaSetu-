import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import HomePage from "./pages/Homepage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import DonorProfilePage from "./pages/DonorProfilePage.jsx";
import PatientProfilePage from "./pages/PatientProfilePage.jsx";
import AdminDonorManagementPage from "./pages/AdminDonorManagementPage.jsx";
import AdminPatientManagementPage from "./pages/AdminPatientManagementPage.jsx";
import DonorDonationHistoryPage from "./pages/DonorDonationHistoryPage.jsx";
import DonorBloodRequestHistoryPage from "./pages/DonorBloodRequestHistoryPage.jsx";
import PatientBloodRequestHistoryPage from "./pages/PatientBloodRequestHistoryPage.jsx";
import VerificationStatusPage from "./pages/VerificationStatusPage.jsx";
import { Spinner, Container } from "react-bootstrap";

// Simplified Protected Route component
const DirectProtectedRoute = ({ allowedRoles, children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUserRole(parsedUser.role);
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-status" element={<VerificationStatusPage />} />

          {/* Protected Routes for Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <DirectProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </DirectProtectedRoute>
            }
          />
          <Route
            path="/admin/donors"
            element={
              <DirectProtectedRoute allowedRoles={["admin"]}>
                <AdminDonorManagementPage />
              </DirectProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <DirectProtectedRoute allowedRoles={["admin"]}>
                <AdminPatientManagementPage />
              </DirectProtectedRoute>
            }
          />

          {/* Protected Routes for Donor */}
          <Route
            path="/donor/profile"
            element={
              <DirectProtectedRoute allowedRoles={["donor"]}>
                <DonorProfilePage />
              </DirectProtectedRoute>
            }
          />
          <Route
            path="/donor/donations"
            element={
              <DirectProtectedRoute allowedRoles={["donor"]}>
                <DonorDonationHistoryPage />
              </DirectProtectedRoute>
            }
          />
          <Route
            path="/donor/blood-requests"
            element={
              <DirectProtectedRoute allowedRoles={["donor"]}>
                <DonorBloodRequestHistoryPage />
              </DirectProtectedRoute>
            }
          />

          {/* Protected Routes for Patient */}
          <Route
            path="/patient/profile"
            element={
              <DirectProtectedRoute allowedRoles={["patient"]}>
                <PatientProfilePage />
              </DirectProtectedRoute>
            }
          />
          <Route
            path="/patient/blood-requests"
            element={
              <DirectProtectedRoute allowedRoles={["patient"]}>
                <PatientBloodRequestHistoryPage />
              </DirectProtectedRoute>
            }
          />

          {/* Catch-all route for 404 */}
          <Route
            path="*"
            element={<h1 className="text-center mt-5">404 Not Found</h1>}
          />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
