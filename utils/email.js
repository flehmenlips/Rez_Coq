const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD
    }
});

// Email templates
const emailTemplates = {
    confirmation: (reservation) => {
        const date = new Date(reservation.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return {
            subject: 'Reservation Confirmation - Le Coq d\'Or',
            text: `
                Thank you for your reservation at Le Coq d'Or!
                
                Reservation Details:
                Date: ${date}
                Time: ${reservation.time}
                Number of Guests: ${reservation.guests}
                Reserved for: ${reservation.name}
                
                Reservation ID: #${reservation.id}
                
                If you need to modify or cancel your reservation, please contact us.
                
                Best regards,
                Le Coq d'Or Team
            `,
            html: `
                <h2>Thank you for your reservation at Le Coq d'Or!</h2>
                
                <h3>Reservation Details:</h3>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${reservation.time}</p>
                <p><strong>Number of Guests:</strong> ${reservation.guests}</p>
                <p><strong>Reserved for:</strong> ${reservation.name}</p>
                
                <p><em>Reservation ID: #${reservation.id}</em></p>
                
                <p>If you need to modify or cancel your reservation, please contact us.</p>
                
                <p>Best regards,<br>Le Coq d'Or Team</p>
            `
        };
    }
};

// Send email function
async function sendEmail(to, template, data) {
    try {
        const emailContent = emailTemplates[template](data);
        
        const info = await transporter.sendMail({
            from: {
                name: 'Coq au Vin',
                address: process.env.SMTP_USER
            },
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

// Add this function for testing
async function testEmailSetup() {
    try {
        console.log('Testing email setup with config:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER
        });

        const testData = {
            id: 'TEST-123',
            date: '2024-12-25',
            time: '7:00 PM',
            guests: 2,
            name: 'Test User',
            email: process.env.SMTP_USER
        };

        console.log('Attempting to send test email to:', process.env.SMTP_USER);
        const result = await sendEmail(process.env.SMTP_USER, 'confirmation', testData);
        console.log('Email sent successfully:', result);
        return true;
    } catch (error) {
        console.error('Test email failed with error:', {
            message: error.message,
            code: error.code,
            command: error.command
        });
        throw error;
    }
}

module.exports = { sendEmail, testEmailSetup }; 