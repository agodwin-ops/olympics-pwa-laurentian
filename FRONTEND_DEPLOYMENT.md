# Frontend Deployment Guide - Olympics PWA

## 🎯 Current Status
- ✅ **Backend API**: Deployed on Render (working)
- ❌ **Frontend UI**: Needs deployment

## 🚀 Deploy Frontend - Choose One Option

### Option 1: Deploy on Vercel (Recommended - Easiest)

1. **Go to [Vercel Dashboard](https://vercel.com)**
2. **Click "New Project"**
3. **Import your GitHub repository**
4. **Configure settings:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)

5. **Add Environment Variable:**
   - **Key**: `NEXT_PUBLIC_API_BASE_URL` 
   - **Value**: `https://your-actual-backend-url.onrender.com`
   - *(Replace with your actual Render backend URL)*

6. **Deploy**: Click "Deploy"

### Option 2: Deploy on Render

1. **Go to [Render Dashboard](https://render.com)**
2. **Create New Web Service**
3. **Connect your GitHub repository**
4. **Configure settings:**
   - **Environment**: Node
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`

5. **Add Environment Variables:**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_BASE_URL=https://your-actual-backend-url.onrender.com
   ```

## 🔗 Connect Frontend to Backend

**IMPORTANT**: Replace `your-actual-backend-url.onrender.com` with your real backend URL.

Your backend URL should be something like:
- `https://claudable-olympics-pwa.onrender.com`
- Or whatever your Render backend service is named

## 🎮 What You'll Get After Deployment

Once deployed, you'll see the **full Olympics PWA interface**:
- 🏔️ **Landing Page** - Winter Olympics theme
- 👨‍🎓 **Student Login** - For students to access games
- 👨‍💼 **Admin Login** - For teachers/admins
- 🏆 **Leaderboards** - Real-time competition tracking
- 🎯 **Olympic Games** - Interactive activities
- 📊 **Dashboard** - Progress tracking

## 🛠️ Files Created for Deployment
- `render-frontend.yaml` - Render configuration
- `apps/web/vercel.json` - Vercel configuration
- Both are ready to use!

## 🔍 Troubleshooting

If frontend doesn't connect to backend:
1. Check environment variable `NEXT_PUBLIC_API_BASE_URL`
2. Verify backend URL is accessible
3. Check browser console for CORS errors
4. Ensure backend CORS allows frontend domain

## ✅ Success Criteria

You'll know it's working when:
- Frontend loads without errors
- You can see the Olympics PWA interface
- Login forms are functional
- API calls succeed (no CORS errors)