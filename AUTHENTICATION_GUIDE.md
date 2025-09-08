# Olympics PWA Authentication Guide

## Current Authentication System

### Primary Instructor Accounts (Production)
**These are the ONLY admin accounts that should be used:**

1. **Primary Instructor 1:**
   - Email: `agodwin@laurentian.ca`
   - Username: `ProfAAG`
   - Password: `HotPotato45%`
   - Role: Primary Instructor (full admin access)

2. **Primary Instructor 2:**
   - Email: `mcuza@laurentian.ca`
   - Username: `MasterGTA` 
   - Password: `PurpleMud30!`
   - Role: Primary Instructor (full admin access)

### Student Account Creation

**Batch Import (Recommended):**
```json
{
  "students": [
    {"email": "student1@laurentian.ca"},
    {"email": "student2@laurentian.ca"}
  ],
  "password_mode": "unique"
}
```

**Result:** Each student gets unique password like `OlyPass_ABC123`

**Single Student Addition:**
- Requires: email, username, user_program
- Gets: unique temporary password
- Must complete profile on first login

### Student Login Flow
1. Login with email + unique password
2. If username starts with `temp_` → redirect to profile completion
3. Choose real username and program
4. Optional: Change password via dashboard
5. Access full Olympics PWA

## Legacy Credentials (DEPRECATED - DO NOT USE)

❌ **These credentials are no longer valid:**
- `instructor@olympics.com` / `InstructorPass123!`
- `admin@olympics.com` / `AdminPass123!`
- Any shared passwords like `Olympics2024!`

## Security Best Practices

✅ **Current System:**
- Unique passwords per student
- Secure credential distribution
- Individual account isolation
- Professional onboarding flow

❌ **Avoid:**
- Shared passwords for multiple students
- Hardcoded test credentials in production
- Legacy authentication patterns

## API Endpoints

**Admin Login:**
```bash
curl -X POST https://olympics-pwa-laurentian.onrender.com/api/auth/login \
  -F "username=agodwin@laurentian.ca" \
  -F "password=HotPotato45%"
```

**Batch Import:**
```bash
curl -X POST https://olympics-pwa-laurentian.onrender.com/api/admin/batch-register-students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"students": [{"email": "student@laurentian.ca"}], "password_mode": "unique"}'
```

---

**Last Updated:** September 2025
**System Version:** Production deployment with secure batch import