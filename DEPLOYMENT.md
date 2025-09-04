# XV Winter Olympic Saga Game - Railway Deployment Guide

## 🚀 Quick Deploy to Railway

### 1. Prepare Supabase Database
1. Create a new Supabase project at https://supabase.com/dashboard
2. Copy your project URL and service role key
3. Run the database schema setup (if needed):
   ```sql
   -- Run in Supabase SQL Editor
   CREATE TABLE users (...);
   CREATE TABLE player_stats (...);
   -- etc. (use your existing schema)
   ```

### 2. Deploy to Railway
1. Push this codebase to GitHub
2. Go to https://railway.app/dashboard
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your Olympics PWA repository
5. Railway will auto-detect the configuration from `railway.json`

### 3. Configure Environment Variables
In Railway dashboard, add these environment variables:

**Required:**
```bash
ENVIRONMENT=production
PORT=8080

# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Authentication
JWT_SECRET_KEY=your-super-secure-jwt-secret-key-here
ADMIN_CODE=OLYMPICS2024ADMIN
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS (Auto-configured for Railway)
ALLOWED_ORIGINS=https://your-custom-domain.com
```

**Optional:**
```bash
RAILWAY_STATIC_URL=your-custom-domain.com
```

### 4. Verify Deployment
1. Wait for deployment to complete
2. Visit your Railway URL (e.g., `https://your-app.railway.app`)
3. Check `/health` endpoint shows: `{"ok": true, "service": "XV Winter Olympic Saga Game"}`
4. Check `/api/system/status` for full system status

## 📁 Project Structure for Railway

```
apps/
├── api/                    # FastAPI Backend
│   ├── app/
│   │   ├── main_olympics_only.py  # Production entry point
│   │   ├── api/                   # API routes
│   │   └── core/                  # Core functionality
│   ├── requirements.olympics.txt  # Optimized dependencies
│   └── ...
├── web/                   # Next.js Frontend (builds to static)
│   ├── next.config.js    # Production optimized
│   └── ...
railway.json              # Railway configuration
nixpacks.toml             # Build configuration
Procfile                  # Process definition
.env.olympics.example     # Environment template
```

## 🏫 Classroom Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Environment variables set in Railway
- [ ] Custom domain configured (optional)
- [ ] Admin account created with `OLYMPICS2024ADMIN` code
- [ ] Students batch-registered via admin panel
- [ ] System tested with 5+ concurrent users

## 🔧 Production Optimizations Applied

### Backend (FastAPI)
- ✅ Uses `main_olympics_only.py` (no SQLite dependencies)
- ✅ Environment-based CORS configuration
- ✅ Rate limiting for classroom use
- ✅ Health checks for Railway
- ✅ Optimized requirements (`requirements.olympics.txt`)
- ✅ Production logging configuration

### Frontend (Next.js)
- ✅ Standalone output for optimal deployment
- ✅ CSS optimization enabled
- ✅ Security headers configured
- ✅ PWA manifest support
- ✅ Production API URL configuration

### Database
- ✅ Pure Supabase PostgreSQL (no local database)
- ✅ Connection pooling via Supabase
- ✅ Row Level Security (RLS) configured
- ✅ Service role key for admin operations

## 🚨 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENVIRONMENT` | Yes | development | Set to `production` for Railway |
| `PORT` | Yes | 8080 | Railway sets this automatically |
| `SUPABASE_URL` | Yes | - | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Your Supabase service role key |
| `JWT_SECRET_KEY` | Yes | - | Secure random string for JWT signing |
| `ADMIN_CODE` | Yes | OLYMPICS2024ADMIN | Code for admin registration |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 480 | JWT token expiration (8 hours) |
| `ALLOWED_ORIGINS` | No | Railway auto-config | Custom domains for CORS |
| `RAILWAY_STATIC_URL` | No | - | Custom domain (if configured) |

## 📊 Monitoring & Health Checks

### Health Check Endpoints
- `GET /health` - Basic health check
- `GET /api/system/status` - Detailed system status

### Expected Performance
- **Concurrent Users:** 50+ students
- **Response Time:** <200ms for API calls
- **Uptime:** 99.9% (Railway SLA)
- **Database:** Supabase handles connection pooling

## 🎓 Post-Deployment Setup

1. **Access Admin Panel:**
   - Go to your deployed URL
   - Register as admin using `OLYMPICS2024ADMIN` code
   
2. **Batch Register Students:**
   - Use "Manage Students" → "Batch Registration"
   - Upload CSV format: `email,username,program`
   - Print password list for classroom distribution

3. **Verify Student Access:**
   - Test login with generated student accounts
   - Verify game features work correctly
   - Check leaderboards update in real-time

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [FastAPI Production](https://fastapi.tiangolo.com/deployment/)

---

**Ready for 50+ student classroom deployment! 🏔️**