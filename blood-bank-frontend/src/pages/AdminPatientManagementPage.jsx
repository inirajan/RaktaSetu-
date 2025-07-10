import React, { useEffect, useState } from "react";
import {
  getAllPatientsAdmin,
  updatePatientAdmin,
  deletePatientAdmin,
} from "../services/api.js";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
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

const AdminPatientManagementPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null); // Local state for logged-in user
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [message, setMessage] = useState(null);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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
    fetchPatients(); // Fetch data only after user is confirmed
  }, [navigate]);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllPatientsAdmin();
      setPatients(response.data);
    } catch (err) {
      setError(err.message || "Failed to fetch patients.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (patient) => {
    setSelectedPatient(patient);
    setEditFormData({
      fullName: patient.fullName,
      age: patient.age,
      email: patient.email,
      bloodGroup: patient.bloodGroup,
      disease: patient.disease ? patient.disease.join(", ") : "",
    });
    setMessage(null);
  };

  const handleDeleteClick = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this patient and all associated requests?"
      )
    ) {
      setMessage(null);
      try {
        await deletePatientAdmin(id);
        setMessage("Patient deleted successfully!");
        fetchPatients();
      } catch (err) {
        setMessage(err.message || "Failed to delete patient.");
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
        disease: editFormData.disease
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d),
      };
      await updatePatientAdmin(selectedPatient._id, dataToSend);
      setMessage("Patient updated successfully!");
      setSelectedPatient(null);
      fetchPatients();
    } catch (err) {
      setMessage(err.message || "Failed to update patient.");
    }
  };

  if (loading || !currentUser)
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Patients...</span>
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
      <h1 className="text-danger mb-4">Manage Patients</h1>
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
          <Card.Title className="text-secondary mb-3">All Patients</Card.Title>
          {patients.length === 0 ? (
            <Alert variant="info">No patients found.</Alert>
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
                  {patients.map((patient) => (
                    <tr key={patient._id}>
                      <td>{patient.fullName}</td>
                      <td>{patient.email}</td>
                      <td>{patient.age}</td>
                      <td>{patient.bloodGroup}</td>
                      <td>
                        {patient.disease && patient.disease.length > 0
                          ? patient.disease.join(", ")
                          : "None"}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <BootstrapButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleEditClick(patient)}
                          >
                            Edit
                          </BootstrapButton>
                          <BootstrapButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteClick(patient._id)}
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
        show={!!selectedPatient}
        onHide={() => setSelectedPatient(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Patient: {selectedPatient?.fullName}</Modal.Title>
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
              id="disease"
              type="text"
              value={editFormData.disease}
              onChange={handleFormChange}
            />
            <Modal.Footer className="px-0 pb-0 pt-3">
              <BootstrapButton
                variant="secondary"
                onClick={() => setSelectedPatient(null)}
              >
                Cancel
              </BootstrapButton>
              <BootstrapButton variant="primary" type="submit">
                Update Patient
              </BootstrapButton>
            </Modal.Footer>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default AdminPatientManagementPage;
