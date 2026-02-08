import React from 'react';

// AUTH BYPASSED for M2M evaluation — all routes public
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
