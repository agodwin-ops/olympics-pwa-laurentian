# XV Winter Olympic Saga Game - Render Deployment Guide

## 🚀 Quick Deploy to Render

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

### 2. Deploy to Render
1. Push this codebase to GitHub
2. Go to https://render.com/dashboard
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect the configuration from `render.yaml`

### 3. Configure Environment Variables
In Render dashboard, add these environment variables:

**Required:**
```bash
ENVIRONMENT=production
PORT=8080

# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Authentication
JWT_SECRET_KEY=your-super-secure-jwt-secret-key-here
ADMIN_CODE=OLYMPICS2024ADMIN
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS (Auto-configured for Render)
ALLOWED_ORIGINS=https://your-custom-domain.com
```

**Optional:**
```bash
RENDER_EXTERNAL_URL=your-custom-domain.com
```

### 4. Verify Deployment
1. Wait for deployment to complete
2. Visit your Render URL (e.g., `https://your-app.onrender.com`)
3. Check `/health` endpoint shows: `{"ok": true, "service": "XV Winter Olympic Saga Game"}`
4. Check `/api/system/status` for full system status

## 📁 Project Structure for Render

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
render.yaml               # Render configuration
Dockerfile                # Build configuration
.env.olympics.example     # Environment template
```

## 🏫 Classroom Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Environment variables set in Render
- [ ] Custom domain configured (optional)
- [ ] Admin account created with `OLYMPICS2024ADMIN` code
- [ ] Students batch-registered via admin panel
- [ ] System tested with 5+ concurrent users

## 🔧 Production Optimizations Applied

### Backend (FastAPI)
- ✅ Uses `main_olympics_only.py` (no SQLite dependencies)
- ✅ Environment-based CORS configuration
- ✅ Rate limiting for classroom use
- ✅ Health checks for Render
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
| `ENVIRONMENT` | Yes | development | Set to `production` for Render |
| `PORT` | Yes | 8080 | Render sets this automatically |
| `SUPABASE_URL` | Yes | - | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Your Supabase service role key |
| `JWT_SECRET_KEY` | Yes | - | Secure random string for JWT signing |
| `ADMIN_CODE` | Yes | OLYMPICS2024ADMIN | Code for admin registration |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 480 | JWT token expiration (8 hours) |
| `ALLOWED_ORIGINS` | No | Render auto-config | Custom domains for CORS |
| `RENDER_EXTERNAL_URL` | No | - | Custom domain (if configured) |

## 📊 Monitoring & Health Checks

### Health Check Endpoints
- `GET /health` - Basic health check
- `GET /api/system/status` - Detailed system status

### Expected Performance
- **Concurrent Users:** 50+ students
- **Response Time:** <200ms for API calls
- **Uptime:** 99.9% (Render SLA)
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

- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [FastAPI Production](https://fastapi.tiangolo.com/deployment/)

---

**Ready for 50+ student classroom deployment! 🏔️**