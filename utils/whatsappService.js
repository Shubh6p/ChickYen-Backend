const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

/**
 * Sends a WhatsApp OTP to the customer
 * @param {string} phone - Customer's phone number
 * @param {string} otp - The 6-digit OTP
 */
const sendWhatsAppOTP = async (phone, otp) => {
    try {
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        const message = await client.messages.create({
            body: `Your ChickYen Achar verification code is: ${otp}. Valid for 5 minutes.`,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${formattedPhone}`
        });
        console.log(`WhatsApp OTP sent: ${message.sid}`);
        return { success: true };
    } catch (error) {
        console.error("WhatsApp OTP failed:", error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Sends automated Order Status updates via WhatsApp
 * @param {string} phone - Customer's phone number
 * @param {string} orderId - The Order ID (e.g. CYA-12345)
 * @param {string} status - New order status
 */
const sendOrderStatusUpdate = async (phone, orderId, status) => {
    let body = "";

    switch (status) {
        case "Verified":
            body = `✅ Your order ${orderId} has been verified! We are waiting for it to be packed. Thank you for choosing ChickYen Achar! 🔥`;
            break;
        case "Packed":
            body = `🍱 Great news! Your order ${orderId} is now packed and waiting to be out for delivery. Get ready for that authentic flavour!`;
            break;
        case "Out for Delivery":
            body = `🚚 Yum is on the way! Your order ${orderId} is out for delivery. Our rider will contact you soon.`;
            break;
        case "Delivered":
            body = `🎉 Order Delivered! Your order ${orderId} has been successfully delivered. We hope you enjoy the spicy kick! Share your review and tag us!`;
            break;
        case "Cancelled":
            body = `❌ Order Update: Your order ${orderId} has been cancelled. If you didn't request this or have questions, please reach out to us on WhatsApp.`;
            break;
        default:
            return false;
    }

    try {
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        const message = await client.messages.create({
            body,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${formattedPhone}`
        });
        console.log(`WhatsApp Status Update sent: ${message.sid} [${status}]`);
        return { success: true };
    } catch (error) {
        console.error(`WhatsApp Status [${status}] failed:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendWhatsAppOTP, sendOrderStatusUpdate };
