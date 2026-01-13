/**
 * Email templates for the SkillConnect application
 */

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkillConnect</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      background-color: #f4f4f4;
      padding: 20px;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #667eea;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #5a67d8;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #666;
      text-align: center;
    }
    .highlight {
      background-color: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      margin: 20px 0;
    }
    .warning {
      background-color: #fff5f5;
      border-left: 4px solid #e53e3e;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SkillConnect</div>
      <p>Connecting Skills, Building Futures</p>
    </div>
    ${content}
    <div class="footer">
      <p>This email was sent by SkillConnect. Please do not reply to this email.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>&copy; 2024 SkillConnect. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// Welcome email template
export const welcomeEmailTemplate = (userName) => {
  const content = `
    <h1>Welcome to SkillConnect!</h1>
    <p>Hi ${userName},</p>
    <p>Thank you for joining SkillConnect! We're excited to have you as part of our community where skills meet opportunities.</p>

    <div class="highlight">
      <h3>What you can do next:</h3>
      <ul>
        <li>Complete your profile to showcase your skills</li>
        <li>Browse available service requests</li>
        <li>Connect with skilled professionals</li>
        <li>Start offering your services</li>
      </ul>
    </div>

    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Get Started</a>

    <p>If you have any questions, feel free to reach out to our support team.</p>
  `;
  return baseTemplate(content);
};

// Service request notification template
export const serviceRequestNotificationTemplate = (providerName, requesterName, serviceType, requestId, requestDetails) => {
  const content = `
    <h2>New Service Request Available</h2>
    <p>Hi ${providerName},</p>
    <p>A new service request has been posted that matches your skills!</p>

    <div class="highlight">
      <h3>Request Details:</h3>
      <p><strong>Service Type:</strong> ${serviceType}</p>
      <p><strong>Requested by:</strong> ${requesterName}</p>
      <p><strong>Request ID:</strong> ${requestId}</p>
      ${requestDetails ? `<p><strong>Description:</strong> ${requestDetails}</p>` : ''}
    </div>

    <p>Don't miss this opportunity to provide your services and earn!</p>

    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Request</a>
  `;
  return baseTemplate(content);
};

// Targeted service request template
export const targetedRequestNotificationTemplate = (providerName, requesterName, serviceType, requestId, requestDetails) => {
  const content = `
    <h2>Personalized Service Request</h2>
    <p>Hi ${providerName},</p>
    <p>You've been specifically selected for a service request!</p>

    <div class="highlight">
      <h3>Request Details:</h3>
      <p><strong>Service Type:</strong> ${serviceType}</p>
      <p><strong>Requested by:</strong> ${requesterName}</p>
      <p><strong>Request ID:</strong> ${requestId}</p>
      ${requestDetails ? `<p><strong>Description:</strong> ${requestDetails}</p>` : ''}
    </div>

    <p style="color: #667eea; font-weight: bold;">
      This request was created specifically for you based on your skills and profile.
    </p>

    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Respond to Request</a>
  `;
  return baseTemplate(content);
};

// Booking confirmation template
export const bookingConfirmationTemplate = (clientName, providerName, serviceType, bookingDate, bookingId, amount) => {
  const content = `
    <h2>Booking Confirmed!</h2>
    <p>Hi ${clientName},</p>
    <p>Your booking has been confirmed successfully.</p>

    <div class="highlight">
      <h3>Booking Details:</h3>
      <p><strong>Service Provider:</strong> ${providerName}</p>
      <p><strong>Service Type:</strong> ${serviceType}</p>
      <p><strong>Date & Time:</strong> ${new Date(bookingDate).toLocaleString()}</p>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      ${amount ? `<p><strong>Amount:</strong> ₱${amount}</p>` : ''}
    </div>

    <p>Please prepare for your appointment and contact your service provider if you need to make any changes.</p>

    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Booking</a>
  `;
  return baseTemplate(content);
};

// Password reset template
export const passwordResetTemplate = (userName, resetToken) => {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${userName},</p>
    <p>You have requested to reset your password for your SkillConnect account.</p>

    <div class="highlight">
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
    </div>

    <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" class="button">Reset Password</a>

    <div class="warning">
      <p><strong>Security Notice:</strong></p>
      <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
    </div>
  `;
  return baseTemplate(content);
};

// Account verification template
export const accountVerificationTemplate = (userName, verificationToken) => {
  const content = `
    <h2>Verify Your Account</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for registering with SkillConnect! Please verify your email address to complete your registration.</p>

    <div class="highlight">
      <p>Click the button below to verify your email address:</p>
    </div>

    <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}" class="button">Verify Email</a>

    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
    <p style="word-break: break-all; background: #f8fafc; padding: 10px; border-radius: 4px;">
      ${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}
    </p>
  `;
  return baseTemplate(content);
};

// Offer acceptance notification template
export const offerAcceptanceTemplate = (providerName, clientName, serviceType, requestId) => {
  const content = `
    <h2>Great News! Your Offer Was Accepted</h2>
    <p>Hi ${providerName},</p>
    <p>Congratulations! Your offer has been accepted by ${clientName}.</p>

    <div class="highlight">
      <h3>Service Details:</h3>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Service Type:</strong> ${serviceType}</p>
      <p><strong>Request ID:</strong> ${requestId}</p>
    </div>

    <p>Please coordinate with your client to schedule the service and discuss any additional details.</p>

    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Details</a>
  `;
  return baseTemplate(content);
};

// Admin notification template
export const adminNotificationTemplate = (subject, message, details = {}) => {
  const content = `
    <h2>Admin Notification</h2>
    <p><strong>Subject:</strong> ${subject}</p>
    <p>${message}</p>

    ${Object.keys(details).length > 0 ? `
    <div class="highlight">
      <h3>Details:</h3>
      ${Object.entries(details).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
    </div>
    ` : ''}

    <a href="${process.env.FRONTEND_URL}/admin/dashboard" class="button">View Admin Panel</a>
  `;
  return baseTemplate(content);
};

export default {
  welcomeEmailTemplate,
  serviceRequestNotificationTemplate,
  targetedRequestNotificationTemplate,
  bookingConfirmationTemplate,
  passwordResetTemplate,
  accountVerificationTemplate,
  offerAcceptanceTemplate,
  adminNotificationTemplate,
};
