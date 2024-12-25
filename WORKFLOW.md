# Git Workflow Checklist

## Before Starting New Feature
1. Ensure you're on develop branch:   ```bash
   git checkout develop   ```

2. Create feature branch:   ```bash
   git checkout -b feature/name-of-feature   ```

## After Feature is Complete
1. Update CHANGELOG.md with new changes
2. Commit all changes:   ```bash
   git add .
   git commit -m "Descriptive message about feature"   ```

3. Switch to develop and merge feature:   ```bash
   git checkout develop
   git merge feature/name-of-feature   ```

4. Test thoroughly on develop

5. If tests pass, merge to main:   ```bash
   git checkout main
   git merge develop   ```

6. Create new version tag:   ```bash
   git tag -a v0.0.x -m "Description of new version"   ```

7. Push changes:   ```bash
   git push origin main
   git push origin develop
   git push origin --tags   ```

## Rollback if Needed 

# Rez Coq - Restaurant Reservation System

## Production Deployment
Successfully deployed at: https://rez-coq.onrender.com

### Features Implemented
- Secure authentication system
- Customer registration and login
- Admin dashboard
- Customer dashboard
- Reservation management
- Email confirmations
- Time slot management
- Capacity controls

### Tech Stack
- Node.js/Express backend
- PostgreSQL database
- Bootstrap UI
- Render.com hosting
- SMTP email integration

### Security Features
- Session management
- Secure cookies
- HTTPS enforcement
- Protected routes
- MIME type security
- XSS protection
- CSRF protection

### Environment Variables
Required for production:
- NODE_ENV=production
- SESSION_SECRET
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_APP_PASSWORD

### Deployment Notes
- PostgreSQL database hosted on Render.com
- Auto-deploys from main branch
- Proper MIME types for static files
- Session handling through secure proxy

# Development Workflow

## Local Development
1. Start local server:
   ```bash
   npm start
   ```

2. Create admin account:
   ```bash
   npm run create-admin
   ```

## Deployment
1. Test changes locally
2. Commit changes with descriptive message
3. Database:
   - PostgreSQL hosted on Render.com
   - Automatic backups included
   - No manual backup needed
4. Use release script for version updates
5. Database persistence:
   - Data stored in /opt/render/project/data
   - Persists between deployments
   - 1GB disk allocation

## Environment Setup
Required environment variables:
- NODE_ENV=production
- PORT=10000
- SESSION_SECRET=<secure-key>
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=<email>
- SMTP_APP_PASSWORD=<app-password>
- ADMIN_EMAIL=<admin-email>
- ADMIN_PASSWORD=<admin-password>

## Testing Checklist
1. Customer Flow:
   - Registration
   - Login
   - Make reservation
   - View reservations
   - Cancel reservation

2. Admin Flow:
   - Login
   - View all reservations
   - Modify settings
   - View database

See [BACKUP.md](BACKUP.md) for detailed backup/restore procedures.