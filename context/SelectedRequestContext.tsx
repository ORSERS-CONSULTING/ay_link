// context/SelectedRequestContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

export const SelectedRequestContext = createContext<any>(null);

export const SelectedRequestProvider = ({ children }:{ children: ReactNode }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  return (
    <SelectedRequestContext.Provider value={{ selectedRequest, setSelectedRequest }}>
      {children}
    </SelectedRequestContext.Provider>
  );
};

export const useSelectedRequest = () => useContext(SelectedRequestContext);
