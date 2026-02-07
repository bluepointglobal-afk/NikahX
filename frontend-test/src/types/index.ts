/**
 * NikahPlus Phase 2 - Type Definitions
 * Core types for matching, filtering, and messaging
 */

// ============================================================================
// Profile & User Types
// ============================================================================

export type Gender = 'male' | 'female';

export type Role = 'user' | 'admin' | 'moderator';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type MatchStatus = 'pending_wali' | 'active' | 'rejected' | 'cancelled';

export type ReligiosityLevel = 'low' | 'moderate' | 'high';

export type PrayerFrequency = 'never' | 'sometimes' | 'often' | 'always';

export type SmokingStatus = 'no' | 'occasionally' | 'yes';

export type MaritalStatus = 'never_married' | 'divorced' | 'widowed';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  gender: Gender;
  dob: string;
  bio: string | null;
  country: string | null;
  city: string | null;
  sect: string | null;
  wants_hijab: boolean | null;
  has_children: boolean | null;
  is_suspended: boolean;
  verification_status: VerificationStatus;
  role: Role;
  subscription_status: 'free' | 'premium';
  likes_remaining: number;
  created_at: string;
  updated_at: string;
  // Phase 2 fields
  education_level: string | null;
  education_field: string | null;
  occupation: string | null;
  religiosity_level: ReligiosityLevel | null;
  prayer_frequency: PrayerFrequency | null;
  halal_diet: boolean | null;
  smoking: SmokingStatus | null;
  languages: string[] | null;
  marital_status: MaritalStatus | null;
  wants_children: boolean | null;
  onboarding_completed_at: string | null;
  profile_photo_url: string | null;
  one_liner: string | null;
}

export interface ProfileCard {
  id: string;
  full_name: string | null;
  gender: Gender;
  dob: string;
  country: string | null;
  city: string | null;
  sect: string | null;
  religiosity_level: string | null;
  education_level: string | null;
  profile_photo_url: string | null;
  one_liner: string | null;
}

// ============================================================================
// Preference & Filter Types
// ============================================================================

export interface Preferences {
  user_id: string;
  min_age: number;
  max_age: number;
  distance_km: number;
  preferred_sect: string | null;
  preferred_religiosity_level: ReligiosityLevel | null;
  education_min_level: string | null;
  allow_international: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchFilters {
  minAge: number;
  maxAge: number;
  location: string | null;
  educationLevel: string | null;
  religiosityLevel: ReligiosityLevel | null;
  sect: string | null;
  hasChildren: boolean | null;
  wantsChildren: boolean | null;
}

export type SortOption = 'compatibility' | 'newest' | 'age_asc' | 'age_desc' | 'distance';

export interface FilterState {
  filters: MatchFilters;
  sortBy: SortOption;
}

// ============================================================================
// Match Types
// ============================================================================

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  is_active: boolean;
  status: MatchStatus;
  unmatched_by: string | null;
  wali_approved_user1_at: string | null;
  wali_approved_user2_at: string | null;
  consented_at: string | null;
  photos_unlocked_at: string | null;
  created_at: string;
  // Joined fields
  other_profile?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface MatchRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  sender_profile?: Profile;
}

export interface MatchWithDetails extends Match {
  other_user: Profile;
  compatibility_score: number;
  is_wali_approved: boolean;
}

// ============================================================================
// Interaction/Swipe Types
// ============================================================================

export type InteractionType = 'like' | 'pass' | 'super_like';

export interface Interaction {
  id: string;
  actor_id: string;
  target_id: string;
  action: 'like' | 'pass';
  created_at: string;
}

export interface SwipeResult {
  success: boolean;
  is_mutual: boolean;
  match_id: string | null;
  status: MatchStatus | null;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageType = 'text' | 'image' | 'voice';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  media_url: string | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  sender?: Profile;
}

export interface Conversation {
  match_id: string;
  other_user: Profile;
  messages: Message[];
  unread_count: number;
  last_message_at: string;
}

// ============================================================================
// Wali/Guardian Types
// ============================================================================

export type WaliLinkStatus = 'pending' | 'active' | 'rejected' | 'revoked';

export interface WaliLink {
  id: string;
  ward_id: string;
  wali_user_id: string | null;
  wali_contact: string;
  invite_code: string;
  status: WaliLinkStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 
  | 'new_match' 
  | 'new_message' 
  | 'wali_approval' 
  | 'match_approved' 
  | 'match_declined'
  | 'match_request';

export interface PushNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: string;
  icon?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DiscoveryFeedResponse {
  profiles: ProfileCard[];
  total: number;
  has_more: boolean;
}

export interface MatchesResponse {
  matches: MatchWithDetails[];
  pending_requests: MatchRequest[];
  total: number;
}

// ============================================================================
// Ranking/Compatibility Types
// ============================================================================

export interface CompatibilityFactors {
  profile_completeness: number;
  preference_alignment: number;
  activity_recency: number;
  dealbreaker_check: number;
  madhab_compatibility: number;
  photo_quality: number;
}

export interface RankedCandidate {
  profile_id: string;
  total_score: number;
  factors: CompatibilityFactors;
  profile_summary?: {
    full_name: string;
    age: number;
    city: string;
    religiosity: string;
  };
}
