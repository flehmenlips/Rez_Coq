# Database Backup & Restore Guide

## Manual Backup
```bash
# Create backup
npm run backup-db
```
Backups are stored in `backups/` directory with timestamp.

## Manual Restore
```bash
# Restore from latest backup
npm run restore-db
```

## Deployment Process
1. Before deploying:
   ```bash
   # Backup current database
   npm run backup-db
   
   # Commit backup
   git add backups/
   git commit -m "Backup database before deployment"
   ```

2. After deployment:
   ```bash
   # If data is missing, restore
   npm run restore-db
   ```

## Backup File Format
Backups are stored as JSON files containing:
- Database schema
- User data
- Reservations
- Settings

## Backup Location
- Development: `./backups/`
- Production: `/opt/render/project/data/backups/`

## Automated Backups
Coming soon:
- Daily backups
- Backup rotation
- Cloud storage integration 