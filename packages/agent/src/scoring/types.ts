export interface TwitterProfile {
  username: string;
  accountAge: number; // days
  followers: number;
  following: number;
  tweetCount: number;
  engagementRate: number; // 0-1
  isVerified: boolean;
  bio: string;
  recentMentions: number; // mentions of our project
}

export interface OnChainProfile {
  address: string;
  walletAge: number; // days
  totalTx: number;
  nftHoldings: number;
  avgHoldDuration: number; // days — higher = diamond hands
  defiActivity: number; // tx count in DeFi protocols
  ethBalance: number;
  isContract: boolean;
}

export interface CommunityProfile {
  engagementCount: number; // replies, RTs, mentions
  constructiveFeedback: number; // quality interactions
  communityDuration: number; // days since first interaction
  referrals: number;
}

export interface BonusSignals {
  kolReferral: boolean;
  earlySupporterDays: number; // 0 = not early
  qualityProjectHoldings: string[]; // names of quality projects held
  otherWLCount: number;
}

export interface WLApplicant {
  twitter: TwitterProfile;
  onChain: OnChainProfile;
  community: CommunityProfile;
  bonus: BonusSignals;
}

export interface ScoreResult {
  category: string;
  score: number; // 0-100
  weight: number; // 0-1
  details: string;
}

export interface WLScore {
  total: number; // weighted average 0-100
  breakdown: ScoreResult[];
  flags: string[];
}
