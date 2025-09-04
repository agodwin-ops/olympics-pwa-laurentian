"""
WSL2-optimized connection helper to resolve IPv6 connectivity issues with Supabase
Forces IPv4-only DNS resolution and direct IP connections for WSL2 compatibility
"""
import socket
import os
import time
from urllib.parse import urlparse, urlunparse
from typing import Optional, Dict, Any


class IPv4OnlySocket:
    """Custom socket wrapper that forces IPv4-only connections"""
    
    def __init__(self):
        # Store original function to avoid recursion
        self.original_getaddrinfo = socket.getaddrinfo
    
    def getaddrinfo(self, host, port, family=0, type=0, proto=0, flags=0):
        """Override getaddrinfo to return only IPv4 addresses"""
        try:
            # Force IPv4-only resolution by filtering results using original function
            results = self.original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
            if results:
                print(f"🔍 IPv4 DNS Resolution for {host}: {[r[4][0] for r in results]}")
                return results
            else:
                raise socket.gaierror(f"No IPv4 addresses found for {host}")
        except socket.gaierror as e:
            print(f"❌ IPv4 DNS Resolution failed for {host}: {e}")
            raise


def patch_socket_for_ipv4():
    """Monkey patch socket.getaddrinfo to force IPv4-only resolution"""
    original_getaddrinfo = socket.getaddrinfo
    ipv4_socket = IPv4OnlySocket()
    socket.getaddrinfo = ipv4_socket.getaddrinfo
    print("🔧 Socket patched for IPv4-only DNS resolution")
    return original_getaddrinfo


def resolve_hostname_to_ipv4(hostname: str, retries: int = 3) -> Optional[str]:
    """Resolve hostname to IPv4 address with retries for WSL2"""
    for attempt in range(retries):
        try:
            # Force IPv4-only address resolution
            result = socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM)
            if result:
                ipv4_address = result[0][4][0]
                print(f"✅ Resolved {hostname} to IPv4: {ipv4_address} (attempt {attempt + 1})")
                return ipv4_address
        except socket.gaierror as e:
            print(f"⚠️ DNS resolution attempt {attempt + 1} failed for {hostname}: {e}")
            if attempt < retries - 1:
                time.sleep(1)  # Wait before retry
            continue
    
    print(f"❌ All DNS resolution attempts failed for {hostname}")
    return None


def force_ipv4_connection(database_url: str) -> str:
    """
    Convert database URL to use IPv4 address directly for WSL2 compatibility
    Handles both direct Supabase connections (IPv6-only) and pooler connections (IPv4 available)
    """
    parsed = urlparse(database_url)
    hostname = parsed.hostname
    
    if not hostname:
        return database_url
    
    print(f"🔄 Forcing IPv4 connection for: {hostname}")
    
    # Handle Supabase pooler connections (have IPv4)
    if "pooler.supabase.com" in hostname:
        print(f"🎯 Detected Supabase pooler - resolving to IPv4")
        ipv4_address = resolve_hostname_to_ipv4(hostname)
        if ipv4_address:
            # Replace hostname with IPv4 address
            new_netloc = parsed.netloc.replace(hostname, ipv4_address)
            new_parsed = parsed._replace(netloc=new_netloc)
            new_url = urlunparse(new_parsed)
            print(f"🎯 IPv4 Pooler URL: {new_url[:50]}...")
            return new_url
        else:
            print(f"⚠️ Could not resolve pooler to IPv4, using hostname (will attempt IPv4-only socket)")
            return database_url
    
    # Handle direct Supabase connections (IPv6-only, won't work in WSL2)
    elif "supabase.co" in hostname:
        print(f"❌ Direct Supabase connection detected - IPv6-only, not compatible with WSL2")
        print(f"💡 Recommend using pooler connection instead")
        return database_url
    
    return database_url


def get_connection_args() -> Dict[str, Any]:
    """
    Get connection arguments optimized for IPv4 and WSL2 networking
    Includes timeout, retry logic, and IPv4-specific socket options
    """
    return {
        "connect_timeout": 15,  # Increased for WSL2
        "application_name": "olympics_api_wsl2",
        "sslmode": "require",
        "options": "-c default_transaction_isolation=read committed",
        # Force TCP keepalive for WSL2 networking stability
        "keepalives_idle": "60",
        "keepalives_interval": "10", 
        "keepalives_count": "3",
    }


def test_ipv4_connectivity(hostname: str, port: int = 5432) -> bool:
    """Test IPv4 connectivity to a hostname and port"""
    ipv4_address = resolve_hostname_to_ipv4(hostname)
    if not ipv4_address:
        return False
    
    try:
        # Test direct IPv4 connection
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((ipv4_address, port))
        sock.close()
        
        if result == 0:
            print(f"✅ IPv4 connectivity test successful: {hostname} ({ipv4_address}:{port})")
            return True
        else:
            print(f"❌ IPv4 connectivity test failed: {hostname} ({ipv4_address}:{port}) - Error: {result}")
            return False
            
    except Exception as e:
        print(f"❌ IPv4 connectivity test error for {hostname}: {e}")
        return False


def debug_pooler_authentication(database_url: str) -> None:
    """Debug Supabase pooler authentication issues"""
    from urllib.parse import urlparse
    
    parsed = urlparse(database_url)
    print(f"🔍 Debugging pooler authentication:")
    print(f"  📋 URL: {database_url[:50]}...")
    print(f"  🏠 Host: {parsed.hostname}")
    print(f"  👤 Username: {parsed.username}")
    print(f"  📊 Database: {parsed.path[1:]}")  # Remove leading /
    print(f"  🔐 SSL Mode: {'require' if 'sslmode=require' in database_url else 'not specified'}")
    
    # Check if this matches Supabase pooler format expectations
    if parsed.username and "." in parsed.username:
        parts = parsed.username.split(".")
        print(f"  🎯 Username format: {parts[0]}.{parts[1]} (project.role format)")
        print(f"  📁 Project: {parts[1]} (should match Supabase project ref)")
    else:
        print(f"  ⚠️ Username format: {parsed.username} (simple format)")


def create_wsl2_optimized_engine(database_url: str, **kwargs):
    """
    Create a WSL2-optimized SQLAlchemy engine with IPv4-only connections
    """
    from sqlalchemy import create_engine
    from sqlalchemy.pool import QueuePool
    
    # Debug authentication for pooler connections
    if "pooler.supabase.com" in database_url:
        debug_pooler_authentication(database_url)
    
    # Patch socket for IPv4-only resolution
    original_getaddrinfo = patch_socket_for_ipv4()
    
    try:
        # Force IPv4 URL conversion
        ipv4_url = force_ipv4_connection(database_url)
        
        # Enhanced connection arguments for WSL2
        connect_args = get_connection_args()
        
        print(f"🔧 Connection arguments: {connect_args}")
        
        # Create engine with WSL2-optimized settings
        engine = create_engine(
            ipv4_url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,  # 1 hour
            connect_args=connect_args,
            echo=False,
            **kwargs
        )
        
        print("🚀 WSL2-optimized database engine created with IPv4-only connections")
        return engine
        
    except Exception as e:
        print(f"❌ Failed to create WSL2-optimized engine: {e}")
        # Restore original socket function
        socket.getaddrinfo = original_getaddrinfo
        raise