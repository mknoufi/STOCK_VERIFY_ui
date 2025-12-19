# Template Repository Usage Guide

## How to Use This Template

This repository is configured as a GitHub template repository. Here's how it works:

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Click "Use this template" on GitHub                     │
│     (Creates a new repository from this template)           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Clone your new repository                               │
│     git clone https://github.com/YOUR_USERNAME/YOUR_REPO    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Run initialization script                               │
│     ./init-new-instance.sh                                  │
│                                                              │
│     This will:                                              │
│     ✓ Check prerequisites (Python, Node, npm, openssl)     │
│     ✓ Generate secure JWT secrets (32-byte base64)         │
│     ✓ Create backend/.env and frontend/.env files          │
│     ✓ Install Python and npm dependencies                  │
│     ✓ Set up git hooks                                      │
│     ✓ Create necessary directories                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Configure your environment                              │
│     Edit backend/.env:                                      │
│     - MongoDB connection string                             │
│     - SQL Server credentials                                │
│     - CORS origins                                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Customize your instance                                 │
│     - Update frontend/app.json (name, slug)                │
│     - Replace frontend/assets/* (icon, splash)             │
│     - Modify colors in frontend/constants/Colors.ts        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Start the application                                   │
│     ./start.sh                                              │
│     or                                                       │
│     docker-compose up --build                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Verify installation                                     │
│     ✓ Backend: http://localhost:8001/api/docs             │
│     ✓ Frontend: http://localhost:8081                      │
│     ✓ Health: http://localhost:8001/health                 │
└─────────────────────────────────────────────────────────────┘
```

## Files Excluded from Template

When you create a new repository from this template, the following files/directories are automatically excluded:

- `.github/workflows/` - Configure your own CI/CD
- `backend.pid` - Runtime process ID
- `backend_port.json` - Runtime configuration
- `.coverage` - Test coverage data
- `tmp/` - Temporary files
- `.venv311/` - Virtual environment
- `node_modules/` - npm dependencies
- `frontend/.expo/` - Expo cache
- `frontend/dist/` - Build artifacts

## Key Files in Template

### Configuration
- `.github/template.yml` - Template metadata and setup instructions
- `TEMPLATE_README.md` - Comprehensive setup guide for new instances
- `init-new-instance.sh` - Automated initialization script
- `CONTRIBUTING.md` - Guidelines for contributing

### Application
- `backend/` - FastAPI backend application
- `frontend/` - React Native + Expo frontend
- `docker-compose.yml` - Docker deployment configuration
- `Makefile` - Common development tasks

### Documentation
- `README.md` - Main documentation
- `docs/` - Detailed documentation
- `.github/copilot-instructions.md` - AI agent guidelines

## Security Features

The initialization script implements several security best practices:

1. **Strong Secret Generation**: Uses `openssl rand -base64 32` to generate cryptographically secure JWT secrets
2. **Secret Validation**: Validates generated secrets meet minimum length requirements (32 chars)
3. **Automatic .gitignore**: Environment files are already excluded from version control
4. **CORS Configuration**: Requires explicit origin configuration (no wildcards)
5. **Environment Isolation**: Separate .env files for backend and frontend

## Customization Points

After creating your instance, you can customize:

### Branding
- App name and slug in `frontend/app.json`
- Icons and splash screens in `frontend/assets/`
- Color scheme in `frontend/constants/Colors.ts`

### Integration
- SQL Server mapping in `backend/db_mapping_config.py`
- Dynamic fields in `backend/dynamic_config.py`
- API endpoints in `backend/api_*.py`

### Deployment
- Docker configuration in `docker-compose.yml`
- Nginx configuration in `nginx/`
- CI/CD workflows in `.github/workflows/`

## Support

- **Setup Issues**: Use the template setup issue template
- **Documentation**: See TEMPLATE_README.md
- **Original Template**: https://github.com/mknoufi/STOCK_VERIFY_ui

## Next Steps

1. Read TEMPLATE_README.md for detailed setup instructions
2. Run ./init-new-instance.sh to initialize
3. Configure your environment in backend/.env
4. Customize branding and settings
5. Test with your ERP system
6. Deploy to production

---

**This is YOUR repository now!** Customize it freely to meet your needs.
