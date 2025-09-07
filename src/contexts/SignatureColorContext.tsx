'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SignatureColorContextType {
  signatureColor: string;
  setSignatureColor: (color: string) => void;
}

const SignatureColorContext = createContext<SignatureColorContextType | undefined>(undefined);

export function SignatureColorProvider({ children }: { children: ReactNode }) {
  const [signatureColor, setSignatureColor] = useState('#FA5616'); // Default signature orange

  // Load signature color from localStorage on mount
  useEffect(() => {
    const savedColor = localStorage.getItem('signatureColor');
    if (savedColor) {
      setSignatureColor(savedColor);
    }
  }, []);

  // Save signature color to localStorage whenever it changes
  const handleSetSignatureColor = (color: string) => {
    setSignatureColor(color);
    localStorage.setItem('signatureColor', color);
  };

  return (
    <SignatureColorContext.Provider value={{ 
      signatureColor, 
      setSignatureColor: handleSetSignatureColor 
    }}>
      {children}
    </SignatureColorContext.Provider>
  );
}

export function useSignatureColor() {
  const context = useContext(SignatureColorContext);
  if (context === undefined) {
    throw new Error('useSignatureColor must be used within a SignatureColorProvider');
  }
  return context;
}

