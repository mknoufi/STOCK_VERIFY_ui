# Stock Verify Template - Getting Started

This repository is a template for creating new Stock Verify instances. Follow this guide to set up your own deployment.

## 🚀 Quick Start (5 minutes)

### 1. Create Your Repository
Click "Use this template" button on GitHub to create a new repository from this template.

### 2. Clone Your New Repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 3. Run Initialization Script
```bash
chmod +x init-new-instance.sh
./init-new-instance.sh
```

This script will:
- Generate secure JWT secrets
- Create environment configuration files
- Set up git hooks
- Install dependencies
- Verify the setup

### 4. Configure Your Environment

Edit `backend/.env` and set your specific values:

```env
# Required: Generate with: openssl rand -base64 32
JWT_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/stock_verify
SQL_SERVER_HOST=your-erp-server
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=your-erp-database
SQL_SERVER_USER=your-username
SQL_SERVER_PASSWORD=your-password

# CORS Configuration
CORS_ALLOW_ORIGINS=http://localhost:8081,exp://localhost:8081
```

### 5. Start the Application

**Option A: Easy Start (macOS/Linux)**
```bash
./start.sh
```

**Option B: Manual Start**
```bash
# Terminal 1 - Backend
cd backend
export PYTHONPATH=..
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
npm start
```

**Option C: Docker**
```bash
docker-compose up --build
```

### 6. Verify Installation

- Backend API: http://localhost:8001/api/docs
- Frontend (Expo): http://localhost:8081
- Health Check: http://localhost:8001/health

## 📋 What's Included

### Backend (FastAPI + Python)
- ✅ JWT Authentication
- ✅ MongoDB integration
- ✅ SQL Server (read-only) integration
- ✅ Dynamic fields and reports system
- ✅ Barcode scanning endpoints
- ✅ Session management
- ✅ Comprehensive test suite

### Frontend (React Native + Expo)
- ✅ File-based routing
- ✅ Zustand state management
- ✅ Barcode scanning
- ✅ Offline-first architecture
- ✅ Swipeable lists
- ✅ Form validation with react-hook-form
- ✅ TypeScript support

### DevOps
- ✅ Docker support
- ✅ Pre-commit hooks
- ✅ CI/CD templates
- ✅ Makefile for common tasks
- ✅ Production deployment guide

## 🔧 Customization

### Branding
1. Update `frontend/app.json` - change app name and slug
2. Replace `frontend/assets/icon.png` and `splash.png`
3. Update colors in `frontend/constants/Colors.ts`

### ERP Integration
1. Configure SQL mapping in `backend/db_mapping_config.py`
2. Test mappings using `/api/mapping/tables` and `/api/mapping/columns` endpoints
3. Adjust barcode lookup queries in `SQL_TEMPLATES`

### Dynamic Fields
Configure custom fields and reports in `backend/dynamic_config.py` following patterns in `DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md`

## 🧪 Testing

```bash
# Run all tests
make ci

# Backend tests only
cd backend && pytest tests/ -v

# Frontend tests
cd frontend && npm test

# Lint and format
make lint
make format
```

## 📖 Documentation

- **Architecture**: See `docs/ARCHITECTURE.md`
- **API Reference**: See `docs/API_REFERENCE.md`
- **Deployment**: See `.yoyo/snapshot/DEPLOYMENT_GUIDE.md`
- **Troubleshooting**: Check `docs/archive/old_docs/TROUBLESHOOTING_GUIDE.md`

## 🆘 Common Issues

### "Module not found" errors
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && rm -rf node_modules && npm install
```

### Port conflicts
```bash
# Kill processes on default ports
./stop_all_services.sh

# Or manually
lsof -ti :8001,8081,19000,19001,19002,19006 | xargs kill -9
```

### Database connection issues
1. Verify MongoDB is running: `mongosh`
2. Test SQL Server connection in `backend/config.py`
3. Check firewall rules for remote databases

## 🔐 Security Checklist

Before deploying to production:

- [ ] Generate strong, unique JWT secrets (32+ characters)
- [ ] Configure restrictive CORS origins (no wildcards)
- [ ] Use environment variables for all secrets (never commit)
- [ ] Enable HTTPS/SSL in production
- [ ] Set up database authentication
- [ ] Review and update `.gitignore`
- [ ] Configure rate limiting in `backend/config.py`
- [ ] Run security audit: `make security-check`

## 📦 Production Deployment

For production deployment instructions, see:
- `.yoyo/snapshot/DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide
- `docker-compose.yml` - Docker configuration
- `nginx/` - Nginx reverse proxy configuration

## 🤝 Contributing

This is your repository! Customize it to fit your needs. Consider:

1. Updating this README with your specific setup
2. Adding your team's coding standards to `.cursorrules`
3. Customizing the CI/CD workflows in `.github/workflows/`
4. Adding your own documentation to `docs/`

## 📞 Support

For issues with the original template:
- Original Repository: https://github.com/mknoufi/STOCK_VERIFY_ui
- Documentation: Check `docs/` directory
- Copilot Instructions: `.github/copilot-instructions.md`

## 📄 License

Review and update the LICENSE file for your deployment.

---

**Next Steps:**
1. Complete environment configuration
2. Customize branding and settings
3. Test with your ERP system
4. Deploy to staging environment
5. Run security audit
6. Deploy to production

Good luck with your Stock Verify deployment! 🚀
