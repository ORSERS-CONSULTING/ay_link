import React, { createContext, useContext, useState } from "react";

export type RequestStatus = "Pending" | "On hold" | "Approved" | "Rejected";

export type ClientRequest = {
  id: string;
  clientName: string;
  currentBalance: number;
  requestedAmount: number;
  status: RequestStatus;
  timestamp: string;
  rejectionNote?: string;
  reason?: string;
  departmentName: string;
  companyCode: string;
  decisionTime?: string;
  approver?: string;
  name?: string;
};

type ClientRequestContextType = {
  requests: ClientRequest[];
  setRequests: React.Dispatch<React.SetStateAction<ClientRequest[]>>;
  updateRequestStatus: (
    id: string,
    status: RequestStatus,
    update?: Partial<ClientRequest>
  ) => void;
  getVisibleRequests: () => ClientRequest[];
};

const ClientRequestContext = createContext<ClientRequestContextType | undefined>(undefined);

export const ClientRequestProvider = ({ children }: { children: React.ReactNode }) => {
  const [requests, setRequests] = useState<ClientRequest[]>([]);

  const updateRequestStatus = (
    id: string,
    status: RequestStatus,
    update: Partial<ClientRequest> = {}
  ) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, status, ...update } : req
      )
    );
  };

  const getVisibleRequests = () => {
    return requests.filter((req) => req.status === "Pending" || req.status === "On hold");
  };

  return (
    <ClientRequestContext.Provider
      value={{
        requests,
        setRequests,
        updateRequestStatus,
        getVisibleRequests,
      }}
    >
      {children}
    </ClientRequestContext.Provider>
  );
};

export const useClientRequests = () => {
  const context = useContext(ClientRequestContext);
  if (!context) {
    throw new Error("useClientRequests must be used within a ClientRequestProvider");
  }
  return context;
};
