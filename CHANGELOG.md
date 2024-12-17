# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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