import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Container,
  Card,
  Alert,
  Spinner,
  Button as BootstrapButton,
} from "react-bootstrap";

const VerificationStatusPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    const verificationStatus = searchParams.get("status");
    const verificationMessage = searchParams.get("message");
    const verificationDetails = searchParams.get("details");

    if (verificationStatus === "success") {
      setStatus("success");
      setMessage(
        verificationMessage || "Your email has been successfully verified!"
      );
      setDetails(
        verificationDetails || "You can now log in with your verified account."
      );
    } else if (verificationStatus === "failure") {
      setStatus("failure");
      setMessage(verificationMessage || "Email verification failed.");
      setDetails(
        verificationDetails ||
          "The verification link might be invalid or expired. Please try registering again or contact support."
      );
    } else {
      setStatus("loading");
      setMessage("Processing your verification request...");
      setTimeout(() => {
        if (!verificationStatus) {
          setStatus("failure");
          setMessage("Invalid verification link.");
          setDetails(
            "No status found in the URL. Please ensure you are using a valid verification link."
          );
        }
      }, 1000);
    }
  }, [searchParams]);

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Card
        className="shadow-lg p-4"
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <Card.Body className="text-center">
          {status === "loading" && (
            <>
              <Spinner animation="border" variant="primary" className="mb-3" />
              <Card.Title className="text-primary">
                Verifying Email...
              </Card.Title>
              <Card.Text>{message}</Card.Text>
            </>
          )}
          {status === "success" && (
            <Alert variant="success" className="mb-3">
              <Alert.Heading>Verification Successful!</Alert.Heading>
              <p>{message}</p>
              <hr />
              <p className="mb-0">{details}</p>
              <div className="d-grid gap-2 mt-3">
                <BootstrapButton as={Link} to="/login" variant="success">
                  Go to Login
                </BootstrapButton>
              </div>
            </Alert>
          )}
          {status === "failure" && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>Verification Failed!</Alert.Heading>
              <p>{message}</p>
              <hr />
              <p className="mb-0">{details}</p>
              <div className="d-grid gap-2 mt-3">
                <BootstrapButton as={Link} to="/register" variant="danger">
                  Try Registering Again
                </BootstrapButton>
                <BootstrapButton as={Link} to="/login" variant="secondary">
                  Go to Login
                </BootstrapButton>
              </div>
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VerificationStatusPage;
