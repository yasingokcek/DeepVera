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
    automationStatus?: 'idle' | 'queued' | 'sent' | 'failed';
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

export interface SenderAccount {
    email: string;
    accessToken?: string;
    status?: 'active' | 'cooldown' | 'failed';
}

export interface User {
    id?: string;
    username?: string;
    password?: string;
    email: string;
    name: string;
    avatar?: string;
    isPro: boolean;
    role?: 'admin' | 'user';
    provider?: 'google' | 'demo' | 'local';
    tokenBalance?: number;
    companyName?: string;
    companyWebsite?: string;
    companyDescription?: string;
    companyFixedPhone?: string;
    companyMobilePhone?: string;
    companyAddress?: string;
    companyLogo?: string;
    authorizedPerson?: string;
    n8nWebhookUrl?: string;
    targetAudience?: string;
    salesStrategy?: string;
    isGmailConnected?: boolean;
    senderAccounts?: SenderAccount[];
    currentSenderIndex?: number;
    globalPitch?: string;
    emailSignature?: string;
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
