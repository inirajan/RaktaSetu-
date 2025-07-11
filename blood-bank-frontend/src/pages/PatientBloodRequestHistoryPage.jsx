import React, { useEffect, useState } from "react";
import { getPatientBloodRequestHistory } from "../services/api.js";
import { Link, useNavigate } from "react-router-dom";
import {
  Container,
  Spinner,
  Alert,
  Table,
  Card,
  Modal,
  Button as BootstrapButton,
} from "react-bootstrap";

const PatientBloodRequestHistoryPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [bloodRequestHistory, setBloodRequestHistory] = useState([]);
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
      return;
    }
    fetchBloodRequestHistory();
  }, [navigate]);

  const fetchBloodRequestHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPatientBloodRequestHistory();
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
      <h1 className="text-danger mb-4">
        My Blood Request History (as Patient)
      </h1>
      <Link to="/patient/profile" className="btn btn-secondary mb-3">
        {" "}
        &larr; Back to Profile
      </Link>

      <Card className="shadow-sm mb-4">
        {" "}
        <Card.Body>
          {bloodRequestHistory.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No blood requests found for this patient.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Admin Comments</th>
                    <th>Action</th>
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
                        {request.matchedDonorsInfo &&
                        request.matchedDonorsInfo.length > 0 ? (
                          <BootstrapButton
                            variant="info"
                            size="sm"
                            onClick={() => viewReceivedDonorInfo(request)}
                          >
                            View Donor Info
                          </BootstrapButton>
                        ) : request.status === "Rejected" &&
                          request.adminComments?.includes(
                            "zero blood stock"
                          ) ? (
                          <span className="text-muted">Admin to send info</span>
                        ) : (
                          <span className="text-muted">No donor Info</span>
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

      {/*  display donor info for the patient */}
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

export default PatientBloodRequestHistoryPage;
