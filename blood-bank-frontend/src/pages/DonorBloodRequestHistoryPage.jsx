// src/pages/DonorBloodRequestHistoryPage.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getDonorBloodRequestHistory, // Import the API function to fetch history
} from "../services/api.js"; // Adjust path as needed
import {
  Container,
  Card,
  Table,
  Spinner,
  Alert,
  Modal,
  Button as BootstrapButton, // Import BootstrapButton for the action column
} from "react-bootstrap";

const DonorBloodRequestHistoryPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [bloodRequestHistory, setBloodRequestHistory] = useState([]); // Renamed from userBloodRequests for consistency with the file
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for displaying received donor info modal
  const [showReceivedDonorInfoModal, setShowReceivedDonorInfoModal] =
    useState(false);
  const [currentDisplayedMatchedDonors, setCurrentDisplayedMatchedDonors] =
    useState([]);
  const [currentDisplayedRequestDetails, setCurrentDisplayedRequestDetails] =
    useState(null);

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
        navigate("/"); // Redirect if not a donor
        return;
      }
      setCurrentUser(parsedUser);
      fetchBloodRequestsHistory(); // Renamed function call
    } catch (parseError) {
      console.error("Failed to parse stored user:", parseError);
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      navigate("/login");
    }
  }, [navigate]);

  const fetchBloodRequestsHistory = async () => {
    // Renamed function
    setLoading(true);
    setError(null);
    try {
      const response = await getDonorBloodRequestHistory();
      setBloodRequestHistory(response.data);
    } catch (err) {
      setError(err.message || "Failed to fetch blood request history.");
    } finally {
      setLoading(false);
    }
  };

  // Handler to show the received donor info modal
  const viewReceivedDonorInfo = (request) => {
    setCurrentDisplayedMatchedDonors(request.matchedDonorsInfo || []);
    setCurrentDisplayedRequestDetails(request);
    setShowReceivedDonorInfoModal(true);
  };

  if (loading || !currentUser)
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">
            Loading Blood Request History...
          </span>
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
      <h1 className="text-danger mb-4">My Blood Request History (as Donor)</h1>

      <Link to="/donor/profile" className="btn btn-secondary mb-3">
        &larr; Back to Profile
      </Link>

      <Card className="shadow-sm mb-4">
        {" "}
        {/* Added mb-4 for consistency */}
        <Card.Body>
          <Card.Title className="text-secondary mb-3">
            Your Blood Request History
          </Card.Title>
          {bloodRequestHistory.length === 0 ? (
            <Alert variant="info">No blood requests made yet.</Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Admin Comments</th>
                    <th>Action</th> {/* Added Action column */}
                  </tr>
                </thead>
                <tbody>
                  {bloodRequestHistory.map((request) => (
                    <tr key={request._id}>
                      <td>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td>{request.bloodGroup}</td>
                      <td>{request.unit}</td>
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
                      <td>
                        {" "}
                        {/* Cell for Action Button */}
                        {request.matchedDonorsInfo &&
                        request.matchedDonorsInfo.length > 0 ? (
                          <BootstrapButton
                            variant="info"
                            size="sm"
                            onClick={() => viewReceivedDonorInfo(request)}
                          >
                            View Donor Info
                          </BootstrapButton>
                        ) : // Optional: Message if no info sent for a rejected request
                        request.status === "Rejected" &&
                          request.adminComments?.includes(
                            "zero blood stock"
                          ) ? (
                          <span className="text-muted">Admin to send info</span>
                        ) : (
                          <span className="text-muted">No donor info</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal to display received donor info for the donor */}
      <Modal
        show={showReceivedDonorInfoModal}
        onHide={() => setShowReceivedDonorInfoModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Potential Donors for Your Blood Request (
            {currentDisplayedRequestDetails?.bloodGroup})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Your request for {currentDisplayedRequestDetails?.bloodGroup}
            blood (Units: {currentDisplayedRequestDetails?.unit}) was handled by
            the blood bank. The following donor information has been provided
            for your direct contact:
          </p>
          {currentDisplayedMatchedDonors.length > 0 ? (
            <div className="table-responsive">
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Last Donation</th>
                    <th>Diseases</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDisplayedMatchedDonors.map((donor) => (
                    // Using a combination for key as _id might not be consistent for lean objects
                    <tr key={donor._id || `${donor.email}-${donor.fullName}`}>
                      <td>{donor.fullName}</td>
                      <td>{donor.email}</td>
                      <td>
                        {donor.lastDonationDate
                          ? new Date(
                              donor.lastDonationDate
                            ).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td>
                        {donor.diseases && donor.diseases.length > 0
                          ? donor.diseases.join(", ")
                          : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="info">
              No specific donor information was provided for this request at
              this time.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <BootstrapButton
            variant="secondary"
            onClick={() => setShowReceivedDonorInfoModal(false)}
          >
            Close
          </BootstrapButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DonorBloodRequestHistoryPage;
