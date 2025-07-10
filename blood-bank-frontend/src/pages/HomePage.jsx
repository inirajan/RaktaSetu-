import React from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import "../styles/DonateBoxes.css";

const HomePage = () => {
  return (
    <>
      <div className="container my-5">
        <div className="row align-items-center">
          <div className="col-md-6 about-text">
            <h2>About Us</h2>
            <p>
              Our platform ensures smooth management of blood donations and
              requests. From donors to patients to administrators, we bring
              everyone together to help those in urgent need. We leverage
              technology to simplify the process, ensuring blood availability
              when and where it's most needed.
            </p>
          </div>
          <div className="col-md-6 about-img text-center">
            <img
              src="/public/donation.jpg"
              alt="Donate blood"
              className="img-fluid shadow"
              style={{
                width: "500px",
                height: "350px",
                borderRadius: "30px",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-light py-5">
        <div className="container text-center">
          <h2 className="mb-4">Why Donate Blood?</h2>
          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="donate-box box-red">
                <h5>Save Lives</h5>
                <p>Each donation can save up to 3 lives.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="donate-box box-blue">
                <h5>Easy Process</h5>
                <p>Our system simplifies the donation and request process.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="donate-box box-green">
                <h5>Community Support</h5>
                <p>Make a real difference in your local community.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container text-center my-5">
        <h2 className="mb-4">Quick Access</h2>
        <div className="d-flex justify-content-center gap-3 flex-wrap">
          <Link to="/login?role=donor" className="btn btn-outline-danger px-4">
            Donor
          </Link>
          <Link
            to="/login?role=patient"
            className="btn btn-outline-primary px-4"
          >
            Patient
          </Link>
          <Link to="/login?role=admin" className="btn btn-outline-dark px-4">
            Admin
          </Link>
        </div>
      </div>
    </>
  );
};

export default HomePage;
