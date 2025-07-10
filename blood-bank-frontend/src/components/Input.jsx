import React from "react";
import { Form } from "react-bootstrap";

const Input = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  className = "",
  error,
  ...props
}) => {
  return (
    <Form.Group className="mb-3">
      {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
      <Form.Control
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        isInvalid={!!error}
        {...props}
      />
      {error && (
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

Input.displayName = "CustomFormInput";

export default Input;
