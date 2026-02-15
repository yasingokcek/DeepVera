
export interface Participant {
  id: string;
  name: string;
  website: string;
  phone: string;
  email: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  industry?: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  emailSubject?: string;
  emailDraft?: string;
  icebreaker?: string;
  competitors?: string[];
  healthScore?: number;
  location?: string;
  isVerified?: boolean;
  automationStatus?: 'idle' | 'queued' | 'sent' | 'failed'; // n8n durumu
  neuralLogs?: string[];
}

export interface ActivityPoint {
  date: string;
  logins: number;
  tokensSpent: number;
  analyses: number;
}

export interface SearchHistory {
  id: string;
  timestamp: number;
  query: string;
  sector: string;
  city: string;
  results: Participant[];
}

export interface User {
  username: string;
  password?: string;
  email: string;
  name: string; 
  avatar?: string;
  isPro: boolean;
  role?: 'admin' | 'user';
  provider: 'google' | 'demo' | 'local';
  tokenBalance: number;
  companyName?: string;
  companyWebsite?: string;
  companyDescription?: string;
  companyFixedPhone?: string; 
  companyMobilePhone?: string; 
  companyAddress?: string;
  companyLogo?: string;
  authorizedPerson?: string;
  n8nWebhookUrl?: string; // n8n Webhook URL
}

export type ViewState = 'landing' | 'login' | 'dashboard' | 'admin';

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  FINDING_DETAILS = 'FINDING_DETAILS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface Sector {
  id: string;
  label: string;
  icon: string;
}

export type SearchMode = 'db' | 'live';
