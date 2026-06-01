import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loader({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
}