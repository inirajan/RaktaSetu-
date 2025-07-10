import nodemailer from "nodemailer";

export const sendEmail = async (receiver, mailBody, subject) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.BUSINESS_EMAIL,
      pass: process.env.APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Blood_Bank" <${process.env.BUSINESS_EMAIL}>`,
    to: receiver,
    subject: subject,
    html: mailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent to", receiver);
    return true;
  } catch (error) {
    console.error("Failed to send email", error.message);
    return false;
  }
};
