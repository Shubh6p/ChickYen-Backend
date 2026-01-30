const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail', // or configured host
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text, html) => {
    const mailOptions = {
        from: `ChickYen Achar <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error("Email send failed:", error);
        return false;
    }
};

/**
 * Sends a professional formatted enquiry email to the admin
 */
const sendContactEmail = async (enquiryData) => {
    const { name, phone, subject, message } = enquiryData;
    const adminEmail = process.env.EMAIL_USER;

    const htmlContent = `
    <html>
        <head>
            <style>
                body { 
                    font-family: 'Plus Jakarta Sans', 'Segoe UI', Helvetica, Arial, sans-serif; 
                    color: #0f172a; 
                    line-height: 1.6; 
                    background-color: #fff8f0;
                    margin: 0;
                    padding: 40px 0;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: #ffffff;
                    border-radius: 30px; 
                    overflow: hidden; 
                    box-shadow: 0 20px 40px rgba(234, 88, 12, 0.08); 
                    border: 1px solid rgba(234, 88, 12, 0.1);
                }
                .header { 
                    background: #0f172a; 
                    color: #ffffff; 
                    padding: 50px 40px; 
                    text-align: center; 
                    border-bottom: 5px solid #ea580c;
                }
                .content { 
                    padding: 45px 40px; 
                }
                .footer { 
                    background: #f8fafc; 
                    padding: 30px; 
                    text-align: center; 
                    font-size: 11px; 
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .label { 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    font-size: 10px; 
                    color: #ea580c; 
                    letter-spacing: 0.15em; 
                    margin-bottom: 8px; 
                    display: block; 
                }
                .value { 
                    font-size: 16px; 
                    margin-bottom: 30px; 
                    color: #0f172a; 
                    font-weight: 700; 
                    display: flex;
                    align-items: center;
                }
                .message-box { 
                    background: #fff7ed; 
                    border: 1.5px dashed #fed7aa; 
                    padding: 30px; 
                    border-radius: 20px; 
                    color: #475569; 
                    font-size: 15px;
                    line-height: 1.7;
                    position: relative;
                }
                .icon-box {
                    width: 32px;
                    height: 32px;
                    background: #fff7ed;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">
                        🔥 New <span style="color: #ea580c;">Enquiry</span>
                    </h1>
                    <p style="margin: 12px 0 0; font-size: 14px; font-weight: 500; color: #94a3b8;">
                        A new customer is reaching out!
                    </p>
                </div>
                
                <div class="content">
                    <div>
                        <span class="label">👤 Customer Name</span>
                        <div class="value">${name}</div>
                    </div>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td width="50%" style="vertical-align: top;">
                                <span class="label">📞 Phone Number</span>
                                <div class="value">${phone}</div>
                            </td>
                            <td width="50%" style="vertical-align: top;">
                                <span class="label">🎯 Inquiry Type</span>
                                <div class="value">
                                    <span style="color: #ea580c;">●</span>&nbsp;${subject}
                                </div>
                            </td>
                        </tr>
                    </table>

                    <div style="margin-top: 10px;">
                        <span class="label">💬 Detailed Message</span>
                        <div class="message-box">
                            <span style="color: #ea580c; font-size: 40px; position: absolute; top: -10px; left: 15px; opacity: 0.2;">“</span>
                            <div style="position: relative; z-index: 1;">${message}</div>
                        </div>
                    </div>

                    <div style="margin-top: 40px; text-align: center;">
                        <a href="tel:${phone}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 15px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                            Call Customer Now ↗
                        </a>
                    </div>
                </div>

                <div class="footer">
                    <p style="margin-bottom: 5px;">Generated by <strong>ChickYen Achar</strong> Admin System</p>
                    <p>© 2026 ChickYen Achar | Authentic Manipuri Flavour</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(
        adminEmail,
        `🔥 New Inquiry: ${subject} from ${name}`,
        `New enquiry from ${name} (${phone}). Subject: ${subject}. Message: ${message}`,
        htmlContent
    );
};

module.exports = { sendEmail, sendContactEmail };
