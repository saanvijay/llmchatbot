# GitHub Workflows

This directory contains GitHub Actions workflows for the LLM Chatbot project.

## Workflows

### 1. CI (`ci.yml`)
**Triggers:** Push to `main`/`develop` branches, Pull Requests
**Purpose:** Continuous Integration - testing and building

**Jobs:**
- **Backend Testing**: Python linting, formatting, import tests, Docker build
- **Frontend Testing**: Node.js dependencies, linting, tests, build
- **Docker Compose Test**: Validates Docker Compose configuration and Makefile

### 2. Deploy (`deploy.yml`)
**Triggers:** Manual dispatch, Push to `main` branch
**Purpose:** Deployment to staging/production environments

**Features:**
- Manual trigger with environment selection (staging/production)
- Automatic deployment on push to main branch
- Docker image building and pushing to GitHub Container Registry
- Frontend build and deployment
- Health checks and status notifications

### 3. Security Scan (`security.yml`)
**Triggers:** Weekly schedule (Mondays 2 AM), Push/PR to main/develop
**Purpose:** Security vulnerability scanning

**Jobs:**
- **Security**: Trivy vulnerability scanner for filesystem
- **Dependency Check**: Python safety and npm audit
- **Docker Security**: Trivy scanning of Docker images

## Usage

### Manual Deployment
1. Go to Actions tab in GitHub
2. Select "Deploy" workflow
3. Click "Run workflow"
4. Choose environment (staging/production)
5. Click "Run workflow"

### Automatic Triggers
- **CI**: Runs automatically on every push and pull request
- **Security**: Runs weekly and on code changes
- **Deploy**: Runs automatically on push to main branch

## Configuration

### Environment Variables
The workflows use these environment variables:
- `REGISTRY`: GitHub Container Registry (ghcr.io)
- `IMAGE_NAME`: Repository name for Docker images

### Secrets
Required secrets for deployment:
- `GITHUB_TOKEN`: Automatically provided by GitHub
- Add additional secrets for your deployment targets (SSH keys, API tokens, etc.)

## Customization

### Adding Deployment Targets
Edit `deploy.yml` and uncomment/modify the deployment commands:
```yaml
# For Docker Compose:
docker-compose -f docker-compose.yml -f docker-compose.${{ environment }}.yml up -d

# For Kubernetes:
kubectl set image deployment/llmchatbot-backend llmchatbot-backend=${{ image }}

# For simple server:
rsync -avz src/frontend/build/ user@server:/var/www/html/
```

### Adding Notifications
Edit the notification steps to integrate with:
- Slack
- Discord
- Email
- Microsoft Teams

### Environment-Specific Configurations
Create environment-specific files:
- `docker-compose.staging.yml`
- `docker-compose.production.yml`
- Environment-specific secrets in GitHub

## Troubleshooting

### Common Issues
1. **Docker build fails**: Check Dockerfile syntax and dependencies
2. **Frontend build fails**: Verify Node.js version and dependencies
3. **Deployment fails**: Check environment secrets and permissions
4. **Security scan fails**: Review vulnerability reports and update dependencies

### Debugging
- Check workflow logs in GitHub Actions
- Use `echo` statements in workflow steps for debugging
- Enable debug logging by setting `ACTIONS_STEP_DEBUG=true` in repository secrets

## Best Practices

1. **Branch Protection**: Enable branch protection rules for main/develop
2. **Required Checks**: Make CI checks required before merging
3. **Environment Protection**: Use environment protection rules for production
4. **Secret Management**: Use GitHub secrets for sensitive data
5. **Regular Updates**: Keep dependencies and workflow actions updated 