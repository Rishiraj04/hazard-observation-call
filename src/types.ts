export type Role = 'user' | 'admin';

export interface User {
  id: number;
  username: string;
  role: Role;
}

export type HazardStatus = 'open' | 'in progress' | 'closed';

export interface Hazard {
  id: number;
  userId: number;
  type: string;
  location: string;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  imageUrl?: string;
  status: HazardStatus;
  remarks?: string;
  createdAt: string;
  reporter?: string;
}

export type WSMessage = 
  | { type: 'NEW_HAZARD'; payload: Hazard }
  | { type: 'STATUS_UPDATE'; payload: Hazard };
