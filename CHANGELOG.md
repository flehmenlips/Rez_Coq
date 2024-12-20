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

## [Unreleased]
### Added
- Daily guest capacity limit setting in dashboard
- Real-time capacity checking for reservations
- Dynamic availability updates based on capacity
- User feedback for capacity limitations
### Changed
- Reservation form now validates against daily capacity
- Time slot selector disabled when capacity is reached

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

## [1.1.13] - YYYY-MM-DD
### Fixed
- Improved database initialization with proper error handling
- Added settings table with default values
- Added database structure verification
- Implemented graceful shutdown for database errors in production
- Added better error reporting and logging for database operations

### Added
- Default settings for restaurant operation parameters:
  - daily_max_guests (100)
  - opening_time (11:00)
  - closing_time (22:00)
  - slot_duration (30)