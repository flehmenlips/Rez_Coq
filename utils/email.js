const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD
    }
});

// Email templates
const emailTemplates = {
    confirmation: (data) => ({
        subject: 'Reservation Confirmation - Coq au Vin',
        text: `
            Thank you for your reservation at Coq au Vin!
            
            Reservation Details:
            Date: ${data.date}
            Time: ${data.time}
            Number of Guests: ${data.guests}
            Reserved for: ${data.name}
            
            Reservation ID: #${data.id}
            
            If you need to modify or cancel your reservation, please contact us.
            
            Best regards,
            Coq au Vin Team
        `,
        html: `
            <h2>Thank you for your reservation at Coq au Vin!</h2>
            
            <h3>Reservation Details:</h3>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Number of Guests:</strong> ${data.guests}</p>
            <p><strong>Reserved for:</strong> ${data.name}</p>
            
            <p><em>Reservation ID: #${data.id}</em></p>
            
            <p>If you need to modify or cancel your reservation, please contact us.</p>
            
            <p>Best regards,<br>Coq au Vin Team</p>
        `
    })
};

async function sendEmail(to, template, data) {
    try {
        const emailContent = emailTemplates[template](data);
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Coq au Vin" <orders@seabreeze.farm>',
            to: to,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
        });

        return info;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
}

module.exports = { sendEmail }; 