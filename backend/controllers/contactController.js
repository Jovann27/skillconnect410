import nodemailer from "nodemailer";

export const sendContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      error: "All fields (name, email, subject, message) are required"
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid email address"
    });
  }

  // Check if email configuration is available
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error("Email configuration missing");
    return res.status(500).json({
      success: false,
      error: "Email service is not configured"
    });
  }

  try {
    // Create transporter with proper SMTP configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"SkillConnect Contact" <${process.env.SMTP_EMAIL}>`,
      to: process.env.SMTP_EMAIL,
      replyTo: email, // Allow replying directly to the sender
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ce4da3ff; text-align: center;">New Contact Message</h2>
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
            <h3>Contact Details:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Subject:</strong> ${subject}</p>

            <h3 style="margin-top: 20px;">Message:</h3>
            <div style="background-color: white; padding: 15px; border-radius: 3px; border-left: 4px solid #ce4da3ff;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <p style="color: #666; font-size: 12px;">
            This message was sent from the SkillConnect contact form.
          </p>
        </div>
      `,
      text: `New Contact Message

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the SkillConnect contact form.`,
    });

    res.json({
      success: true,
      message: "Message sent successfully!"
    });
  } catch (err) {
    console.error("Email error:", err.message);
    res.status(500).json({
      success: false,
      error: `Failed to send message: ${err.message}`
    });
  }
};
