// Simple debug page to test auth context in isolation
import { useOlympicsAuth } from '../contexts/OlympicsAuthContext';

export default function DebugAuth() {
  const { user, loading } = useOlympicsAuth();
  
  console.log('🐛 Debug Auth Page - loading:', loading, 'user:', user ? 'set' : 'null');
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth Debug Page</h1>
      <p>Loading: {loading ? 'TRUE (stuck!)' : 'FALSE (good)'}</p>
      <p>User: {user ? `Authenticated (${user.email})` : 'NULL (not authenticated)'}</p>
      
      {loading && (
        <div style={{ color: 'red', fontWeight: 'bold' }}>
          ❌ STUCK IN LOADING STATE - This is the issue!
        </div>
      )}
      
      {!loading && !user && (
        <div style={{ color: 'green' }}>
          ✅ NOT LOADING, NO USER - Should redirect to onboarding
        </div>
      )}
      
      {!loading && user && (
        <div style={{ color: 'blue' }}>
          ✅ AUTHENTICATED - User should see dashboard
        </div>
      )}
    </div>
  );
}