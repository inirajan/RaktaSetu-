import React from "react";
import { Button as BootstrapButton } from "react-bootstrap";

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "danger",
  className = "",
  disabled = false,
  ...rest
}) => {
  return (
    <BootstrapButton
      type={type}
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      className={className}
      {...rest}
    >
      {children}
    </BootstrapButton>
  );
};

export default Button;
