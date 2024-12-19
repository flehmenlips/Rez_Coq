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