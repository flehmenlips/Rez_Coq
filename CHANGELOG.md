# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Daily guest capacity limit setting in dashboard
- Real-time capacity checking for reservations
- Dynamic availability updates based on capacity
- User feedback for capacity limitations
### Changed
- Reservation form now validates against daily capacity
- Time slot selector disabled when capacity is reached

## [1.3.3] - 2024-03-21
### Added
- Migrated to PostgreSQL database
- Added Render.com PostgreSQL integration
- Fixed deployment paths
- Added session table creation
- Enabled auto-deployment on Render
- Added deployment notifications
- Added environment-specific database config
- Added database connection testing

### Changed
- Switched from SQLite to PostgreSQL
- Updated database connection handling
- Consolidated deployment settings
- Improved session management
- Enhanced SSL configuration

## [1.3.1] - 2024-03-21
### Added
- Admin dashboard functionality

## [1.2.0] - 2024-03-21
### Added
- Successfully deployed to production
- Complete authentication system
- Session management
- Email confirmation system
- Improved dashboard styling
- Fixed production deployment issues
- Added proper session handling
- Fixed authentication flows
- Added secure login/register system
- Improved error handling and logging

### Changed
- Entry point now redirects to login
- Enhanced security headers
- Improved server configuration
- Updated database handling
- Fixed MIME type issues
- Improved session store configuration

## [1.2.1] - 2024-03-21
### Fixed
- Authentication system stable in production
- Session management working properly
- Database connections reliable
- Email system configured and tested
- Security headers properly set

### Added
- Production status monitoring
- Deployment documentation
- System health checks
- Better error logging
- Admin authentication system
- Secure admin account creation
- Environment-based configuration
- Production admin initialization

## [1.1.18] - 2024-03-20
### Added
- Customer registration system
- Customer dashboard with reservation management
- Role-based access control
- Improved login UI and navigation
- Converted to pure web application
- Removed Electron dependencies
- Fixed email confirmation system
- Added proper email templates
- Improved error handling for emails
- Deployed to production on Render.com
- Protected all reservation endpoints
- Improved authentication flow
- Fixed production deployment issues
- Added proper session handling
- Improved security headers
- Fixed routing and authentication flow

### Changed
- Dashboard now requires authentication
- Settings API routes protected
- Improved security for admin functions
- Simplified deployment process
- Streamlined dependencies
- Updated email configuration
- Fixed Node.js compatibility issues
- Changed entry point to login page
- Required authentication for all reservation actions
- Improved login page styling
- Enhanced server configuration for production

## [1.1.14] - 2024-03-20
### Changed
- Simplified operating hours settings in dashboard
- Improved time slot generation logic
- Added strict validation for reservation times
- Fixed duplicate time settings conflict

### Added
- Better time slot validation
- Last booking time restrictions
- Clear help text for operating hours

## [1.1.13-9] - 2024-03-20
### Added
- Email confirmation system for reservations
- Email status tracking in database
- Email retry functionality in dashboard
- Visual email status indicators
- Test email endpoint for system verification

### Changed
- Dashboard now shows email status for each reservation
- Reservation flow includes email confirmation
- Database schema updated to track email status

### Technical Details
- Added nodemailer integration
- Email template system
- SMTP configuration via environment variables
- Error handling for failed emails
- Status tracking: pending/sent/failed

## [1.1.13] - 2024-12-20
### Fixed
- Fixed database paths for production and development environments
- Improved logging system with better formatting
- Added loading spinner for reservation submissions
- Fixed duplicate log entries
- Consolidated database initialization
- Added proper error handling for database operations

### Added
- Production-safe logging system
- Visual feedback during form submission
- Success page with proper styling
- Database path detection for packaged app

## [1.0.1] - YYYY-MM-DD
### Fixed
- Improved database initialization with proper error handling
- Added settings table with default values
- Added database structure verification
- Implemented graceful shutdown for database errors in production
- Added better error reporting and logging for database operations

### Added
- New settings table for application configuration
- Default settings for restaurant operation parameters

## [0.0.1] - 2024-03-19
### Added
- Initial project setup
- Basic restaurant reservation system
- Frontend reservation form with date, time, guests, email, and name fields
- Backend API endpoints for reservations
- SQLite database integration
- Settings dashboard with:
  - Operating hours configuration
  - Maximum party size setting
  - Time slot interval management
- Reservation viewing interface in dashboard
- Basic CSS styling for all components

### Technical Details
- Express.js server implementation
- SQLite database with tables for:
  - reservations
  - settings
- Static file serving for frontend
- Form validation and error handling 