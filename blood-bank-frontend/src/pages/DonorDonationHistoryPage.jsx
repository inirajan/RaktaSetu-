import React, { useEffect, useState } from "react";
import { getDonorDonationHistory } from "../services/api.js";
import { Link, useNavigate } from "react-router-dom"; 
import { Container, Spinner, Alert, Table, Card } from "react-bootstrap";

const DonorDonationHistoryPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null); // Local state for logged-in user
  const [donationHistory, setDonationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect to verify authentication and load current user from localStorage
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
    fetchDonationHistory(); // Fetch data only after user is confirmed
  }, [navigate]);

  const fetchDonationHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDonorDonationHistory();
      setDonationHistory(response.data);
    } catch (err) {
      setError(err.message || "Failed to fetch donation history.");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currentUser)
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Donation History...</span>
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
      <h1 className="text-danger mb-4">My Donation History</h1>
      <Link to="/donor/profile" className="btn btn-link mb-3">
        &larr; Back to Profile
      </Link>

      <Card className="shadow-sm">
        <Card.Body>
          {donationHistory.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No blood donation requests found for you.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Units</th>
                    <th>Diseases</th>
                    <th>Status</th>
                    <th>Admin Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {donationHistory.map((request) => (
                    <tr key={request._id}>
                      <td>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td>{request.unit}</td>
                      <td>
                        {request.disease && request.disease.length > 0
                          ? request.disease.join(", ")
                          : "None"}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            request.status === "Approved"
                              ? "bg-success"
                              : request.status === "Rejected"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td>{request.adminComments || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DonorDonationHistoryPage;
