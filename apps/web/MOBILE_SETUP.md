# Mobile Development Setup

## Issue: "Failed to fetch" on Mobile

Mobile devices cannot connect to `localhost:8080` because localhost refers to the mobile device itself, not your development machine.

## Solution: Use Your Machine's IP Address

### 1. Find Your Machine's IP Address

#### On Linux/macOS:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# OR
ifconfig | grep "inet " | grep -v 127.0.0.1
```

#### On Windows:
```cmd
ipconfig | findstr "IPv4"
```

Look for an IP address like `192.168.1.100` or `10.0.0.50`

### 2. Update Environment Variables

Edit `apps/web/.env.local`:
```bash
# Replace localhost with your machine's IP
NEXT_PUBLIC_API_BASE_URL=http://YOUR_IP_ADDRESS:8080
NEXT_PUBLIC_WS_BASE=ws://YOUR_IP_ADDRESS:8080
```

Example:
```bash
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:8080
NEXT_PUBLIC_WS_BASE=ws://192.168.1.100:8080
```

### 3. Restart Development Servers

```bash
# Restart frontend
npm run dev

# Backend should already be accessible on all interfaces (0.0.0.0:8080)
```

### 4. Access on Mobile

- **Frontend**: http://YOUR_IP_ADDRESS:3000
- **API**: http://YOUR_IP_ADDRESS:8080

### 5. Production Deployment

For production, this is handled automatically:
- **Vercel Frontend**: Uses production API URL via environment variables
- **Render Backend**: Accessible via public URL

## Troubleshooting

- Ensure both devices are on the same WiFi network
- Check firewall settings on your development machine
- Verify backend is running with `--host 0.0.0.0` (already configured)