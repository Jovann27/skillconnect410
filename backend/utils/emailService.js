import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email function
export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send targeted service request notification
export const sendTargetedRequestNotification = async (providerEmail, providerName, requesterName, serviceType, requestId) => {
  const subject = `New Targeted Service Request - ${serviceType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #667eea;">New Targeted Service Request</h2>
      <p>Hi ${providerName},</p>
      <p>You have received a targeted service request from <strong>${requesterName}</strong> for <strong>${serviceType}</strong>.</p>
      <p>Please check your dashboard to view and respond to this request.</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Service Type:</strong> ${serviceType}</p>
        <p><strong>Requester:</strong> ${requesterName}</p>
        <p><strong>Request ID:</strong> ${requestId}</p>
      </div>
      <p style="color: #666; font-size: 14px;">
        This is a targeted request specifically offered to you by the customer.
      </p>
      <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
        View Request
      </a>
    </div>
  `;

  return await sendEmail(providerEmail, subject, html);
};
