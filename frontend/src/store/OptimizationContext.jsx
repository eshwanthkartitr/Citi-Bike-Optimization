import { createContext, useContext, useState } from 'react';

const OptimizationContext = createContext();

export function OptimizationProvider({ children }) {
  const [optimizationResult, setOptimizationResult] = useState(null);
  
  return (
    <OptimizationContext.Provider value={{ optimizationResult, setOptimizationResult }}>
      {children}
    </OptimizationContext.Provider>
  );
}

export function useOptimization() {
  const context = useContext(OptimizationContext);
  if (!context) {
    throw new Error('useOptimization must be used within OptimizationProvider');
  }
  return context;
}
