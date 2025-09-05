# Manual Admin Setup Guide

## 🎯 **Problem Solved**
This creates Primary Instructor admin users directly in Supabase, bypassing the problematic registration form.

## 🚀 **Quick Setup Steps**

### Step 1: Customize the SQL Script

1. **Edit `CREATE_ADMIN_USERS.sql`**
2. **Replace these values:**
   ```sql
   'instructor1@laurentian.ca'     → Your actual email #1
   'instructor2@laurentian.ca'     → Your actual email #2  
   'primary_instructor_1'          → Desired username #1
   'primary_instructor_2'          → Desired username #2
   'SecureAdmin123!'               → Secure password #1
   'SecureAdmin456!'               → Secure password #2
   ```

### Step 2: Run in Supabase

1. **Go to [Supabase SQL Editor](https://app.supabase.com/project/gcxryuuggxnnitesxzpq/sql)**
2. **Paste the customized SQL script**  
3. **Click "RUN"**
4. **Verify the results show your admin users**

### Step 3: Test Login

1. **Go to your frontend**
2. **Use admin login with:**
   - **Email**: Your actual email
   - **Password**: Your chosen password
3. **Should now have full admin access!**

## 📋 **What This Creates**

**Two admin users with:**
- ✅ **Program**: "Primary Instructor" 
- ✅ **Admin Status**: `true`
- ✅ **Full Admin Access**: Complete system control
- ✅ **Secure Passwords**: Properly hashed in database
- ✅ **Immediate Access**: No registration form needed

## 🔐 **Security Benefits**

- **Direct database creation** - Bypasses problematic API
- **Secure password hashing** - Uses proper cryptographic functions  
- **Admin verification** - Confirms creation with query
- **Controlled access** - Only you have these credentials

## ✅ **Success Verification**

After running the script, you should see output like:
```
id                  | email                    | username              | is_admin
uuid-here          | instructor1@laurentian.ca| primary_instructor_1  | true
uuid-here          | instructor2@laurentian.ca| primary_instructor_2  | true
```

## 🎯 **Next Steps**

Once created, these admin users can:
- Access full admin dashboard
- Manage student accounts  
- Configure Olympic games
- Monitor leaderboards
- Handle all system administration

**This approach is more reliable than the registration form!**