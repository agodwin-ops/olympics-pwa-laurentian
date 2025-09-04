#!/bin/bash
# Force Supabase connection by removing DATABASE_URL to trigger fallback check

echo "🔄 Attempting to force Supabase connection..."

# Temporarily set environment to force Supabase connection attempt
export FORCE_SUPABASE=true

# Try different DNS resolution methods
echo "1. Trying with different DNS servers..."
export SUPABASE_HOST="db.gcxryuuggxnnitesxzpq.supabase.co"

# Test IPv4 resolution via different DNS
echo "Testing DNS resolution:"
echo "Using 8.8.8.8:"
nslookup $SUPABASE_HOST 8.8.8.8 2>/dev/null || echo "Failed with Google DNS"

echo "Using 1.1.1.1:"  
nslookup $SUPABASE_HOST 1.1.1.1 2>/dev/null || echo "Failed with Cloudflare DNS"

# Try ping with IPv4 only
echo -e "\n2. Testing IPv4 connectivity:"
ping -4 -c 1 $SUPABASE_HOST 2>/dev/null && echo "✅ IPv4 ping successful!" || echo "❌ IPv4 ping failed"

echo -e "\n3. Testing IPv6 connectivity:"
ping -6 -c 1 $SUPABASE_HOST 2>/dev/null && echo "✅ IPv6 ping successful!" || echo "❌ IPv6 ping failed"

echo -e "\n4. Current network interfaces:"
ip addr show | grep -E "(inet6?|UP)" | head -10

echo -e "\n5. DNS configuration:"
cat /etc/resolv.conf | head -5

echo -e "\nTo fix IPv6 connectivity:"
echo "1. Restart WSL: wsl --shutdown (in Windows)"
echo "2. Or add to /etc/wsl.conf:"
echo "   [network]"
echo "   generateHosts = false"
echo "3. Or use Windows IPv6 connectivity"