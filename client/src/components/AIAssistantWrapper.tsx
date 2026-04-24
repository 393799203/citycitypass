import React, { lazy, Suspense, useState } from 'react';
import { Bot } from 'lucide-react';

const AIAssistantComponent = lazy(() => import('./AIAssistant'));

export default function AIAssistantWrapper() {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleClick = () => {
    setIsLoaded(true);
  };

  const handleUnload = () => {
    setIsLoaded(false);
  };

  return (
    <>
      {!isLoaded && (
        <button
          onClick={handleClick}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}
      {isLoaded && (
        <Suspense fallback={null}>
          <AIAssistantComponent onUnload={handleUnload} />
        </Suspense>
      )}
    </>
  );
}
