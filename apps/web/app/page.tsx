'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Olympics RPG onboarding
    router.replace('/onboarding');
  }, [router]);

  return (
    <div className="min-h-screen winter-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-olympic-blue rounded-full mb-4 shadow-lg animate-pulse">
          <span className="text-white text-2xl font-oswald font-bold">🏔️</span>
        </div>
        <h1 className="text-2xl font-oswald font-bold text-gray-900 mb-2">
          Loading Olympics RPG...
        </h1>
        <p className="text-gray-600">
          Redirecting to your Olympic journey
        </p>
      </div>
    </div>
  );
}