import React, { useEffect, useState } from "react";
import {
  getAdminDashboardStats,
  updateBloodStock,
  getAllDonationRequestsAdmin,
  handleDonationRequestAdmin,
  getAllBloodRequestsAdmin,
  handleBloodRequestAdmin,
  getDonorsByBloodGroupAdmin,
  sendDonorInfoToRequesterAdmin, // Keep this import for the new functionality
} from "../services/api.js";
import { Link, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Table,
  Button as BootstrapButton,
  Spinner,
  Alert,
  Modal, // Keep Modal import for the admin's view/send confirmation
} from "react-bootstrap";
import Input from "../components/Input.jsx";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [stockUpdates, setStockUpdates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stockUpdateMessage, setStockUpdateMessage] = useState(null);

  const [donationRequests, setDonationRequests] = useState([]);
  const [bloodRequests, setBloodRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(null);

  // For donor search
  const [searchBloodGroup, setSearchBloodGroup] = useState("");
  const [foundDonors, setFoundDonors] = useState([]);
  const [donorSearchLoading, setDonorSearchLoading] = useState(false);
  const [donorSearchError, setDonorSearchError] = useState(null);

  // States for handling the admin's 'Send Donor Info' modal
  const [showDonorInfoModal, setShowDonorInfoModal] = useState(false);
  const [currentRequestDetailsForModal, setCurrentRequestDetailsForModal] =
    useState(null); // Changed name for clarity
  const [potentialDonorsForModal, setPotentialDonorsForModal] = useState([]); // Changed name for clarity

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
      if (parsedUser.role !== "admin") {
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

    fetchDashboardStats();
    fetchAllRequests();
  }, [navigate]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminDashboardStats();
      setDashboardStats(response.data);
      const initialStockUpdates = {};
      response.data.bloodStock.forEach((stock) => {
        initialStockUpdates[stock.bloodGroup] = stock.unit;
      });
      setStockUpdates(initialStockUpdates);
    } catch (err) {
      setError(err.message || "Failed to fetch dashboard stats.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRequests = async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const [donationsRes, bloodRes] = await Promise.all([
        getAllDonationRequestsAdmin(),
        getAllBloodRequestsAdmin(),
      ]);
      setDonationRequests(donationsRes.data);
      setBloodRequests(bloodRes.data);
    } catch (err) {
      setRequestsError(err.message || "Failed to fetch requests.");
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleStockChange = (bloodGroup, value) => {
    setStockUpdates((prev) => ({
      ...prev,
      [bloodGroup]: value,
    }));
  };

  const handleUpdateStock = async (bloodGroup) => {
    setStockUpdateMessage(null);
    try {
      const unit = stockUpdates[bloodGroup];
      if (typeof unit !== "number" || unit < 0) {
        setStockUpdateMessage(`Invalid unit for ${bloodGroup}`);
        return;
      }
      await updateBloodStock(bloodGroup, unit);
      setStockUpdateMessage(`Stock for ${bloodGroup} updated successfully!`);
      fetchDashboardStats();
    } catch (err) {
      setStockUpdateMessage(
        err.message || `Failed to update stock for ${bloodGroup}.`
      );
    }
  };

  const handleDonationAction = async (requestId, action, comments = "") => {
    try {
      await handleDonationRequestAdmin(requestId, action, comments);
      alert(`Donation request ${action}ed successfully!`);
      fetchAllRequests();
    } catch (err) {
      alert(`Failed to ${action} donation request: ${err.message}`);
    }
  };

  // Reverted handleBloodRequestAction: This now only handles the admin's approval/rejection decision.
  // It no longer tries to fetch or display donor info directly.
  const handleBloodRequestAction = async (requestId, action, comments = "") => {
    try {
      await handleBloodRequestAdmin(requestId, action, comments);
      alert(`Blood request ${action}ed successfully!`);
      fetchAllRequests(); // Always re-fetch requests to update UI
    } catch (err) {
      console.error("Error handling blood request:", err);
      // Display general error message if it's not the specific '0 units' rejection
      alert(
        `Failed to ${action} blood request: ${
          err.message || "An unknown error occurred."
        }`
      );
      fetchAllRequests(); // Always re-fetch requests to update UI even on error
    }
  };

  // NEW: Handler for sending donor info from Admin Dashboard
  const handleSendDonorInfo = async (request) => {
    // Pass the whole request object
    setPotentialDonorsForModal([]); // Clear previous data
    setCurrentRequestDetailsForModal(null);

    try {
      // Call the new API to store donor info with the request
      const response = await sendDonorInfoToRequesterAdmin(request._id);

      // Now fetch the actual donor list for display in the modal from the response
      // The backend should return `potentialDonors` in its data
      setPotentialDonorsForModal(response.data.potentialDonors || []);
      setCurrentRequestDetailsForModal(request); // Use the original request details for modal display
      setShowDonorInfoModal(true); // Show the modal

      alert(
        "Donor information prepared and linked to the blood request for the requester to view."
      );
      fetchAllRequests(); // Refresh requests to reflect the change (e.g., the matchedDonorsInfo field will now be populated)
    } catch (err) {
      console.error("Error sending donor info:", err);
      alert(
        `Failed to send donor info: ${
          err.message || "An unknown error occurred."
        }`
      );
    }
  };

  // Handler for Donor Search
  const normalGroup = {
    "A+": "aplus",
    "A-": "aminus",
    "B+": "bplus",
    "B-": "bminus",
    "AB+": "abplus",
    "AB-": "abminus",
    "O+": "oplus",
    "O-": "ominus",
  };

  const search = {
    aplus: "A+",
    aminus: "A-",
    bplus: "B+",
    bminus: "B-",
    abplus: "AB+",
    abminus: "AB-",
    oplus: "O+",
    ominus: "O-",
  };

  const handleDonorSearch = async (e) => {
    e.preventDefault();
    setDonorSearchLoading(true);
    setDonorSearchError(null);
    setFoundDonors([]);
    try {
      const response = await getDonorsByBloodGroupAdmin(searchBloodGroup);
      setFoundDonors(response.data);
      if (response.data.length === 0) {
        setDonorSearchError(`No Donors found for ${search[searchBloodGroup]}`);
      }
    } catch (error) {
      setDonorSearchError(error.message || `Failed to search for donors`);
    } finally {
      setDonorSearchLoading(false);
    }
  };

  if (loading || !currentUser)
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Dashboard...</span>
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
      <h1 className="text-danger mb-4">Admin Dashboard</h1>
      {currentUser && <p className="mb-3">Welcome, {currentUser.username}</p>}
      <Row className="g-4 mb-4">
        <Col xs={12} md={6} lg={3}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <Card.Title className="text-secondary">Total Donors</Card.Title>
              <Card.Text className="fs-1 fw-bold text-danger">
                {dashboardStats.donors}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} lg={3}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <Card.Title className="text-secondary">Total Patients</Card.Title>
              <Card.Text className="fs-1 fw-bold text-danger">
                {dashboardStats.patients}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} lg={3}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <Card.Title className="text-secondary">
                Total Blood Units
              </Card.Title>
              <Card.Text className="fs-1 fw-bold text-danger">
                {dashboardStats.totalUnits}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} lg={3}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <Card.Title className="text-secondary">
                Donation Pending
              </Card.Title>
              <Card.Text className="fs-1 fw-bold text-danger">
                {dashboardStats.donationRequests.Pending}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6} lg={3}>
          <Card className="shadow-sm text-center">
            <Card.Body>
              <Card.Title className="text-secondary">
                Blood Request Pending
              </Card.Title>
              <Card.Text className="fs-1 fw-bold text-danger">
                {dashboardStats.bloodRequests.Pending}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <hr className="my-4" /> {/* Retained original HR tag */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-danger mb-3">User Management</Card.Title>
          <div className="d-flex flex-wrap gap-3">
            <Link to="/admin/donors" className="btn btn-info text-white">
              Manage Donors
            </Link>
            <Link to="/admin/patients" className="btn btn-secondary">
              Manage Patients
            </Link>
          </div>
        </Card.Body>
      </Card>
      <hr className="my-4" /> {/* Retained original HR tag */}
      {/* Donor Search by Blood Group */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-danger mb-3">
            Search Donors by Blood Group
          </Card.Title>
          <Form onSubmit={handleDonorSearch} className="mb-3">
            <Row className="align-items-end">
              <Col xs={12} md={6} lg={4}>
                <Form.Group className="mb-3 mb-md-0">
                  <Form.Label htmlFor="searchBloodGroup">
                    Blood Group
                  </Form.Label>
                  <Form.Select
                    id="searchBloodGroup"
                    value={searchBloodGroup}
                    onChange={(e) => setSearchBloodGroup(e.target.value)}
                    required
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map((group) => (
                      <option key={group} value={normalGroup[group]}>
                        {group}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6} lg={2}>
                <BootstrapButton
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={donorSearchLoading}
                >
                  {donorSearchLoading ? (
                    <Spinner as="span" animation="border" size="sm" />
                  ) : (
                    "Search"
                  )}
                </BootstrapButton>
              </Col>
            </Row>
          </Form>
          {donorSearchError && (
            <Alert variant="danger">{donorSearchError}</Alert>
          )}
          {foundDonors.length > 0 && (
            <div className="table-responsive">
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Blood Group</th>
                    <th>Last Donation</th>
                    <th>Diseases</th>
                  </tr>
                </thead>
                <tbody>
                  {foundDonors.map((donor) => (
                    <tr key={donor._id}>
                      <td>{donor.fullName}</td>
                      <td>{donor.email}</td>
                      <td>{donor.bloodGroup}</td>
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
          )}
        </Card.Body>
      </Card>
      <hr className="my-4" /> {/* Retained original HR tag */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-danger mb-3">
            Blood Stock Management
          </Card.Title>
          {stockUpdateMessage && (
            <Alert
              variant={
                stockUpdateMessage.includes("successfully")
                  ? "success"
                  : "danger"
              }
              className="mt-3"
            >
              {stockUpdateMessage}
            </Alert>
          )}
          <Row className="g-3">
            {bloodGroups.map((group) => (
              <Col xs={12} md={6} lg={4} key={group}>
                <Form.Group as={Row} className="align-items-center">
                  <Form.Label column sm="4" className="fw-semibold">
                    {group}:
                  </Form.Label>
                  <Col sm="5">
                    <Form.Control
                      type="number"
                      value={
                        stockUpdates[group] !== undefined
                          ? stockUpdates[group]
                          : ""
                      }
                      onChange={(e) =>
                        handleStockChange(group, parseInt(e.target.value))
                      }
                      min="0"
                    />
                  </Col>
                  <Col sm="3">
                    <BootstrapButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateStock(group)}
                    >
                      Update
                    </BootstrapButton>
                  </Col>
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
      <hr className="my-4" /> {/* Retained original HR tag */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-danger mb-3">
            Donation Requests
          </Card.Title>
          {requestsLoading ? (
            <div className="d-flex justify-content-center">
              <Spinner animation="border" size="sm" />{" "}
              <span className="ms-2">Loading Donation Requests...</span>
            </div>
          ) : requestsError ? (
            <Alert variant="danger">Error: {requestsError}</Alert>
          ) : donationRequests.length === 0 ? (
            <Alert variant="info">No donation requests found.</Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Email</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donationRequests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.donorId?.fullName || "N/A"}</td>
                      <td>{request.donorId?.email || "N/A"}</td>
                      <td>{request.donorId?.bloodGroup || "N/A"}</td>
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
                      <td>
                        {request.status === "Pending" && (
                          <div className="d-flex gap-2">
                            <BootstrapButton
                              variant="success"
                              size="sm"
                              onClick={() =>
                                handleDonationAction(request._id, "Approved")
                              }
                            >
                              Approve
                            </BootstrapButton>
                            <BootstrapButton
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                handleDonationAction(request._id, "Rejected")
                              }
                            >
                              Reject
                            </BootstrapButton>
                          </div>
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
      <hr className="my-4" /> {/* Retained original HR tag */}
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title className="text-danger mb-3">Blood Requests</Card.Title>
          {requestsLoading ? (
            <div className="d-flex justify-content-center">
              <Spinner animation="border" size="sm" />{" "}
              <span className="ms-2">Loading Blood Requests...</span>
            </div>
          ) : requestsError ? (
            <Alert variant="danger">Error: {requestsError}</Alert>
          ) : bloodRequests.length === 0 ? (
            <Alert variant="info">No blood requests found.</Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Type</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Admin Comments</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bloodRequests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.requesterId?.fullName || "N/A"}</td>
                      <td className="text-capitalize">
                        {request.requesterType}
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
                      <td>
                        {request.adminComments || "N/A"}
                        {request.matchedDonorsInfo &&
                          request.matchedDonorsInfo.length > 0 && (
                            <i
                              className="bi bi-person-lines-fill ms-2"
                              title="Donor info sent"
                            ></i>
                          )}
                      </td>
                      <td>
                        {request.status === "Pending" && (
                          <div className="d-flex gap-2">
                            <BootstrapButton
                              variant="success"
                              size="sm"
                              onClick={() =>
                                handleBloodRequestAction(
                                  request._id,
                                  "Approved"
                                )
                              }
                            >
                              Approve
                            </BootstrapButton>
                            <BootstrapButton
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                handleBloodRequestAction(
                                  request._id,
                                  "Rejected"
                                )
                              }
                            >
                              Reject
                            </BootstrapButton>
                          </div>
                        )}
                        {/* Only show 'Send Donor Info' if rejected AND info hasn't been sent yet */}
                        {request.status === "Rejected" &&
                          (!request.matchedDonorsInfo ||
                            request.matchedDonorsInfo.length === 0) && (
                            <BootstrapButton
                              variant="info"
                              size="sm"
                              className="mt-2"
                              onClick={
                                () => handleSendDonorInfo(request) // Pass the full request object
                              }
                            >
                              Send Donor Info
                            </BootstrapButton>
                          )}
                        {/* Show 'View Sent Info' if rejected AND info HAS been sent */}
                        {request.status === "Rejected" &&
                          request.matchedDonorsInfo?.length > 0 && (
                            <BootstrapButton
                              variant="outline-info"
                              size="sm"
                              className="mt-2"
                              onClick={
                                () => handleSendDonorInfo(request) // Reuse to view info if already sent
                              }
                            >
                              View Sent Info
                            </BootstrapButton>
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
      {/* Admin's Donor Information Modal - for confirmation/viewing before/after sending */}
      <Modal
        show={showDonorInfoModal}
        onHide={() => setShowDonorInfoModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Donor Information for Blood Request (
            {currentRequestDetailsForModal?.bloodGroup})
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            For Blood Request ID: `{currentRequestDetailsForModal?._id}`
            <br />
            Requester:{" "}
            {currentRequestDetailsForModal?.requesterId?.fullName || "N/A"}{" "}
            <br />
            Type: {currentRequestDetailsForModal?.requesterType} <br />
            The requester can now see this info in their blood request on their
            profile.
          </p>
          <p>The following donors match the requested blood group.</p>
          {potentialDonorsForModal.length > 0 ? (
            <div className="table-responsive">
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Blood Group</th>
                    <th>Last Donation Date</th>
                    <th>Diseases</th>
                  </tr>
                </thead>
                <tbody>
                  {potentialDonorsForModal.map((donor) => (
                    <tr key={donor._id}>
                      <td>{donor.fullName}</td>
                      <td>{donor.email}</td>
                      <td>{donor.bloodGroup}</td>
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
              No email-verified donors found for{" "}
              {currentRequestDetailsForModal?.bloodGroup} at this time.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <BootstrapButton
            variant="secondary"
            onClick={() => setShowDonorInfoModal(false)}
          >
            Close
          </BootstrapButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;
