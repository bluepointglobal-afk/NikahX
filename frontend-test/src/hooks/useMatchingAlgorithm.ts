/**
 * NikahPlus Phase 2 - Matching Algorithm Hook
 * Provides filtering, sorting, and ranking of potential matches
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { 
  ProfileCard, 
  MatchFilters, 
  SortOption, 
  ReligiosityLevel,
  CompatibilityFactors 
} from '../types';

interface UseMatchingAlgorithmOptions {
  initialFilters?: Partial<MatchFilters>;
  initialSort?: SortOption;
  limit?: number;
}

interface UseMatchingAlgorithmReturn {
  profiles: ProfileCard[];
  filteredProfiles: ProfileCard[];
  rankedProfiles: (ProfileCard & { score: number; factors: CompatibilityFactors })[];
  loading: boolean;
  error: string | null;
  filters: MatchFilters;
  sortBy: SortOption;
  hasMore: boolean;
  setFilters: (filters: MatchFilters) => void;
  updateFilter: <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) => void;
  setSortBy: (sort: SortOption) => void;
  resetFilters: () => void;
  refreshProfiles: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const DEFAULT_FILTERS: MatchFilters = {
  minAge: 18,
  maxAge: 60,
  location: null,
  educationLevel: null,
  religiosityLevel: null,
  sect: null,
  hasChildren: null,
  wantsChildren: null,
};

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function calculateCompatibilityScore(
  profile: ProfileCard,
  userPrefs: Record<string, unknown> | null
): { score: number; factors: CompatibilityFactors } {
  const factors: CompatibilityFactors = {
    profile_completeness: 0,
    preference_alignment: 0,
    activity_recency: 0,
    dealbreaker_check: 0,
    madhab_compatibility: 0,
    photo_quality: 0,
  };

  // 1. Profile Completeness (0-20 points)
  const requiredFields = [
    'full_name', 'dob', 'country', 'city', 
    'sect', 'religiosity_level', 'education_level'
  ];
  const filledFields = requiredFields.filter(field => {
    const value = profile[field as keyof ProfileCard];
    return value !== null && value !== undefined && value !== '';
  });
  factors.profile_completeness = Math.round((filledFields.length / requiredFields.length) * 20);

  // 2. Preference Alignment (0-25 points)
  let alignmentScore = 25;
  if (userPrefs) {
    const profileAge = profile.dob ? calculateAge(profile.dob) : null;
    if (profileAge && userPrefs.min_age && userPrefs.max_age) {
      const minAge = userPrefs.min_age as number;
      const maxAge = userPrefs.max_age as number;
      if (profileAge < minAge || profileAge > maxAge) {
        alignmentScore -= 10;
      } else {
        // Bonus for being in the ideal range
        const idealAge = (minAge + maxAge) / 2;
        const ageDiff = Math.abs(profileAge - idealAge);
        alignmentScore += Math.max(0, 5 - ageDiff * 0.5);
      }
    }
    
    if (userPrefs.preferred_sect && profile.sect !== userPrefs.preferred_sect) {
      alignmentScore -= 5;
    }
    
    if (userPrefs.preferred_religiosity_level && 
        profile.religiosity_level !== userPrefs.preferred_religiosity_level) {
      alignmentScore -= 5;
    }
  }
  factors.preference_alignment = Math.max(0, Math.min(25, Math.round(alignmentScore)));

  // 3. Activity Recency (0-15 points) - assume recent for new profiles
  factors.activity_recency = 10;

  // 4. Dealbreaker Check (0-20 points)
  factors.dealbreaker_check = 20; // Assume no dealbreakers by default

  // 5. Madhab/Sect Compatibility (0-10 points)
  if (profile.sect) {
    factors.madhab_compatibility = 10;
  } else {
    factors.madhab_compatibility = 5; // Neutral if not specified
  }

  // 6. Photo Quality (0-10 points)
  factors.photo_quality = profile.profile_photo_url ? 10 : 5;

  const totalScore = 
    factors.profile_completeness +
    factors.preference_alignment +
    factors.activity_recency +
    factors.dealbreaker_check +
    factors.madhab_compatibility +
    factors.photo_quality;

  return { score: totalScore, factors };
}

export function useMatchingAlgorithm(
  options: UseMatchingAlgorithmOptions = {}
): UseMatchingAlgorithmReturn {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPrefs, setUserPrefs] = useState<Record<string, unknown> | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [filters, setFilters] = useState<MatchFilters>({
    ...DEFAULT_FILTERS,
    ...options.initialFilters,
  });
  
  const [sortBy, setSortBy] = useState<SortOption>(options.initialSort || 'compatibility');
  const limit = options.limit || 20;

  // Fetch user preferences
  useEffect(() => {
    const fetchUserPrefs = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data) {
        setUserPrefs(data);
        // Update filters based on user preferences
        setFilters(prev => ({
          ...prev,
          minAge: data.min_age || 18,
          maxAge: data.max_age || 60,
          religiosityLevel: data.preferred_religiosity_level || null,
          sect: data.preferred_sect || null,
        }));
      }
    };

    fetchUserPrefs();
  }, [user]);

  // Fetch discovery feed
  const fetchProfiles = useCallback(async (newOffset: number = 0) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_discovery_feed', {
        p_limit: limit,
        p_offset: newOffset,
      });

      if (rpcError) throw rpcError;

      const fetchedProfiles = (data as ProfileCard[]) || [];
      
      if (newOffset === 0) {
        setProfiles(fetchedProfiles);
      } else {
        setProfiles(prev => [...prev, ...fetchedProfiles]);
      }
      
      setHasMore(fetchedProfiles.length === limit);
      setOffset(newOffset + fetchedProfiles.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  // Initial fetch
  useEffect(() => {
    fetchProfiles(0);
  }, [fetchProfiles]);

  // Apply filters
  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      const age = profile.dob ? calculateAge(profile.dob) : null;

      // Age filter
      if (age !== null) {
        if (age < filters.minAge || age > filters.maxAge) return false;
      }

      // Location filter
      if (filters.location) {
        const locationMatch = 
          profile.city?.toLowerCase().includes(filters.location.toLowerCase()) ||
          profile.country?.toLowerCase().includes(filters.location.toLowerCase());
        if (!locationMatch) return false;
      }

      // Education filter
      if (filters.educationLevel && profile.education_level !== filters.educationLevel) {
        return false;
      }

      // Religiosity filter
      if (filters.religiosityLevel && profile.religiosity_level !== filters.religiosityLevel) {
        return false;
      }

      // Sect filter
      if (filters.sect && profile.sect !== filters.sect) {
        return false;
      }

      return true;
    });
  }, [profiles, filters]);

  // Apply sorting and scoring
  const rankedProfiles = useMemo(() => {
    const withScores = filteredProfiles.map(profile => {
      const { score, factors } = calculateCompatibilityScore(profile, userPrefs);
      return { ...profile, score, factors };
    });

    return withScores.sort((a, b) => {
      switch (sortBy) {
        case 'compatibility':
          return b.score - a.score;
        case 'newest':
          return 0; // Discovery feed already returns newest first
        case 'age_asc':
          return (a.dob ? calculateAge(a.dob) : 0) - (b.dob ? calculateAge(b.dob) : 0);
        case 'age_desc':
          return (b.dob ? calculateAge(b.dob) : 0) - (a.dob ? calculateAge(a.dob) : 0);
        default:
          return b.score - a.score;
      }
    });
  }, [filteredProfiles, sortBy, userPrefs]);

  const updateFilter = useCallback(<K extends keyof MatchFilters>(
    key: K, 
    value: MatchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      minAge: userPrefs?.min_age as number || 18,
      maxAge: userPrefs?.max_age as number || 60,
      religiosityLevel: userPrefs?.preferred_religiosity_level as ReligiosityLevel || null,
      sect: userPrefs?.preferred_sect as string || null,
    });
  }, [userPrefs]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchProfiles(offset);
    }
  }, [loading, hasMore, offset, fetchProfiles]);

  return {
    profiles,
    filteredProfiles,
    rankedProfiles,
    loading,
    error,
    filters,
    sortBy,
    hasMore,
    setFilters,
    updateFilter,
    setSortBy,
    resetFilters,
    refreshProfiles: () => fetchProfiles(0),
    loadMore,
  };
}
