const nodemailer = require('nodemailer');
const log = require('./logger');

// Log email configuration
log.info('Email configuration:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER ? 'configured' : 'missing',
    pass: process.env.SMTP_APP_PASSWORD ? 'configured' : 'missing'
});

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD
    },
    debug: true, // Enable debug logging
    logger: true  // Log to console
});

// Verify transporter connection
transporter.verify(function(error, success) {
    if (error) {
        log.error('SMTP connection error:', error);
        log.error('SMTP configuration:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT === '465'
        });
    } else {
        log.info('SMTP server is ready to send emails');
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
    }),
    cancellation: (data) => ({
        subject: 'Reservation Cancellation - Coq au Vin',
        text: `
            Your reservation at Coq au Vin has been cancelled.
            
            Cancelled Reservation Details:
            Date: ${data.date}
            Time: ${data.time}
            Number of Guests: ${data.guests}
            Reserved for: ${data.name}
            
            Reservation ID: #${data.id}
            
            If you would like to make a new reservation, please visit our website.
            
            Best regards,
            Coq au Vin Team
        `,
        html: `
            <h2>Reservation Cancellation - Coq au Vin</h2>
            
            <p>Your reservation at Coq au Vin has been cancelled.</p>
            
            <h3>Cancelled Reservation Details:</h3>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Number of Guests:</strong> ${data.guests}</p>
            <p><strong>Reserved for:</strong> ${data.name}</p>
            
            <p><em>Reservation ID: #${data.id}</em></p>
            
            <p>If you would like to make a new reservation, please visit our website.</p>
            
            <p>Best regards,<br>Coq au Vin Team</p>
        `
    })
};

// Send email function with improved error handling
async function sendEmail(to, template, data) {
    if (!emailTemplates[template]) {
        throw new Error(`Email template '${template}' not found`);
    }

    const emailContent = emailTemplates[template](data);
    
    try {
        const info = await transporter.sendMail({
            from: `"Coq au Vin" <${process.env.SMTP_USER}>`,
            to: to,
            subject: emailContent.subject,
            text: emailContent.text.trim(),
            html: emailContent.html.trim()
        });
        
        log.info('Email sent successfully:', {
            messageId: info.messageId,
            template: template,
            to: to
        });
        
        return info;
    } catch (error) {
        log.error('Failed to send email:', {
            error: error.message,
            template: template,
            to: to,
            data: data
        });
        throw error;
    }
}

module.exports = { sendEmail }; 