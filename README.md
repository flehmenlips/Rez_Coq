# Rez Coq - Restaurant Reservation System

A modern, secure restaurant reservation system built with Node.js and SQLite. Features customer reservations, email confirmations, and a complete admin dashboard.

## Live Demo
https://rez-coq.onrender.com

## Features

### Customer Portal
- User registration and authentication
- Make/view/cancel reservations
- Email confirmations
- Real-time availability checking
- Mobile-friendly interface

### Admin Dashboard
- Complete reservation management
- Restaurant settings configuration
  - Operating hours
  - Time slots
  - Capacity limits
  - Maximum party size
- Database monitoring
- Email status tracking

## Tech Stack
- **Backend**: Node.js, Express
- **Database**: SQLite3
- **Frontend**: HTML5, Bootstrap 5
- **Email**: Nodemailer
- **Security**: Session-based auth, CSRF protection
- **Hosting**: Render.com

## Local Development

1. **Prerequisites**
   - Node.js 18.x
   - npm
   - Git

2. **Installation**
   ```bash
   # Clone repository
   git clone https://github.com/flehmenlips/Rez_Coq.git
   cd Rez_Coq

   # Install dependencies
   npm install

   # Set up environment
   cp env.example .env
   # Edit .env with your settings
   ```

3. **Create Admin Account**
   ```bash
   npm run create-admin
   ```

4. **Start Server**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables
```env
# Server
NODE_ENV=development
PORT=10000

# Security
SESSION_SECRET=your-secure-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_APP_PASSWORD=your-app-password

# Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

## Deployment

Currently deployed on Render.com with automatic deployments from main branch.

1. **Setup on Render**
   - Connect GitHub repository
   - Set environment variables
   - Deploy

2. **Version Management**
   ```bash
   # Create new version
   ./release.sh 1.2.3
   ```

## Project Structure
```
.
├── main.js              # Entry point
├── middleware/          # Auth & security
├── routes/             # API routes
├── utils/              # Helper functions
├── public/             # Static files
│   ├── css/           # Stylesheets
│   ├── js/            # Client scripts
│   └── *.html         # Page templates
└── scripts/           # Admin tools
```

## Development Workflow

See [WORKFLOW.md](WORKFLOW.md) for detailed:
- Git workflow
- Testing procedures
- Deployment steps
- Version management

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## License

MIT License - See LICENSE file

## Author

George Page