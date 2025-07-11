import React, { useEffect, useState } from "react";
import {
  getAllDonorsAdmin,
  updateDonorAdmin,
  deleteDonorAdmin,
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
  Modal,
} from "react-bootstrap";
import Input from "../components/Input.jsx";

const AdminDonorManagementPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [message, setMessage] = useState(null);

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
    fetchDonors(); // Fetch data only after user is confirmed
  }, [navigate]);

  const fetchDonors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllDonorsAdmin();
      setDonors(response.data);
    } catch (err) {
      setError(err.message || "Failed to fetch donors.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (donor) => {
    setSelectedDonor(donor);
    setEditFormData({
      fullName: donor.fullName,
      age: donor.age,
      email: donor.email,
      bloodGroup: donor.bloodGroup,
      diseases: donor.diseases ? donor.diseases.join(", ") : "",
    });
    setMessage(null);
  };

  const handleDeleteClick = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this donor and all associated requests?"
      )
    ) {
      setMessage(null);
      try {
        await deleteDonorAdmin(id);
        setMessage("Donor deleted successfully!");
        fetchDonors();
      } catch (err) {
        setMessage(err.message || "Failed to delete donor.");
      }
    }
  };

  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const dataToSend = {
        ...editFormData,
        age: parseInt(editFormData.age),
        diseases: editFormData.diseases
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d),
      };
      await updateDonorAdmin(selectedDonor._id, dataToSend);
      setMessage("Donor updated successfully!");
      setSelectedDonor(null);
      fetchDonors();
    } catch (err) {
      setMessage(err.message || "Failed to update donor.");
    }
  };

  if (loading || !currentUser)
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Donors...</span>
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
      <h1 className="text-danger mb-4">Manage Donors</h1>
      <Link to="/admin/dashboard" className="btn btn-link mb-3">
        &larr; Back to Dashboard
      </Link>

      {message && (
        <Alert
          variant={message.includes("successfully") ? "success" : "danger"}
          className="mt-3"
        >
          {message}
        </Alert>
      )}

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="text-secondary mb-3">All Donors</Card.Title>
          {donors.length === 0 ? (
            <Alert variant="info">No donors found.</Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Age</th>
                    <th>Blood Group</th>
                    <th>Diseases</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((donor) => (
                    <tr key={donor._id}>
                      <td>{donor.fullName}</td>
                      <td>{donor.email}</td>
                      <td>{donor.age}</td>
                      <td>{donor.bloodGroup}</td>
                      <td>
                        {donor.diseases && donor.diseases.length > 0
                          ? donor.diseases.join(", ")
                          : "None"}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <BootstrapButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleEditClick(donor)}
                          >
                            Edit
                          </BootstrapButton>
                          <BootstrapButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteClick(donor._id)}
                          >
                            Delete
                          </BootstrapButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal
        show={!!selectedDonor}
        onHide={() => setSelectedDonor(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Donor: {selectedDonor?.fullName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateSubmit}>
            <Input
              label="Full Name"
              id="fullName"
              type="text"
              value={editFormData.fullName}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Email"
              id="email"
              type="email"
              value={editFormData.email}
              onChange={handleFormChange}
              required
            />
            <Input
              label="Age"
              id="age"
              type="number"
              value={editFormData.age}
              onChange={handleFormChange}
              min="1"
              max="120"
              required
            />
            <Form.Group className="mb-3">
              <Form.Label htmlFor="bloodGroup">Blood Group</Form.Label>
              <Form.Select
                id="bloodGroup"
                value={editFormData.bloodGroup}
                onChange={handleFormChange}
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
              label="Diseases (comma separated)"
              id="diseases"
              type="text"
              value={editFormData.diseases}
              onChange={handleFormChange}
            />
            <Modal.Footer className="px-0 pb-0 pt-3">
              <BootstrapButton
                variant="secondary"
                onClick={() => setSelectedDonor(null)}
              >
                Cancel
              </BootstrapButton>
              <BootstrapButton variant="primary" type="submit">
                Update Donor
              </BootstrapButton>
            </Modal.Footer>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AdminDonorManagementPage;
