/**
 * NikahPlus Phase 2 - Filter Panel Component
 * Allows users to filter and sort potential matches
 */

import { useState } from 'react';
import type { MatchFilters, SortOption, ReligiosityLevel } from '../types';

interface FilterPanelProps {
  filters: MatchFilters;
  sortBy: SortOption;
  onFilterChange: (filters: MatchFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'compatibility', label: 'Best Compatibility' },
  { value: 'newest', label: 'Newest First' },
  { value: 'age_asc', label: 'Age: Youngest First' },
  { value: 'age_desc', label: 'Age: Oldest First' },
];

const EDUCATION_LEVELS = [
  'High School',
  'Bachelor\'s',
  'Master\'s',
  'PhD',
  'Other',
];

const RELIGIOSITY_LEVELS: { value: ReligiosityLevel; label: string }[] = [
  { value: 'low', label: 'Cultural/Moderate' },
  { value: 'moderate', label: 'Practicing' },
  { value: 'high', label: 'Very Practicing' },
];

export default function FilterPanel({
  filters,
  sortBy,
  onFilterChange,
  onSortChange,
  onReset,
  isOpen,
  onClose,
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<MatchFilters>(filters);
  const [localSort, setLocalSort] = useState<SortOption>(sortBy);

  if (!isOpen) return null;

  const handleApply = () => {
    onFilterChange(localFilters);
    onSortChange(localSort);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(filters);
    setLocalSort('compatibility');
    onReset();
    onClose();
  };

  const updateLocalFilter = <K extends keyof MatchFilters>(
    key: K,
    value: MatchFilters[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-md max-h-[85vh] bg-slate-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white text-lg font-semibold">Filter & Sort</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Sort */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Sort By</label>
            <select
              value={localSort}
              onChange={(e) => setLocalSort(e.target.value as SortOption)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Age Range */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Age Range: {localFilters.minAge} - {localFilters.maxAge}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={18}
                max={60}
                value={localFilters.minAge}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value <= localFilters.maxAge) {
                    updateLocalFilter('minAge', value);
                  }
                }}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="range"
                min={18}
                max={60}
                value={localFilters.maxAge}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= localFilters.minAge) {
                    updateLocalFilter('maxAge', value);
                  }
                }}
                className="flex-1 accent-emerald-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={localFilters.location || ''}
              onChange={(e) => updateLocalFilter('location', e.target.value || null)}
              placeholder="City or country..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Education Level */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Education Level</label>
            <select
              value={localFilters.educationLevel || ''}
              onChange={(e) => updateLocalFilter('educationLevel', e.target.value || null)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Any</option>
              {EDUCATION_LEVELS.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Religiosity Level */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Religious Practice</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-750 transition">
                <input
                  type="radio"
                  name="religiosity"
                  checked={localFilters.religiosityLevel === null}
                  onChange={() => updateLocalFilter('religiosityLevel', null)}
                  className="accent-emerald-500"
                />
                <span className="text-slate-300">Any</span>
              </label>
              {RELIGIOSITY_LEVELS.map(level => (
                <label 
                  key={level.value} 
                  className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-750 transition"
                >
                  <input
                    type="radio"
                    name="religiosity"
                    checked={localFilters.religiosityLevel === level.value}
                    onChange={() => updateLocalFilter('religiosityLevel', level.value)}
                    className="accent-emerald-500"
                  />
                  <span className="text-slate-300">{level.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sect */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Sect</label>
            <select
              value={localFilters.sect || ''}
              onChange={(e) => updateLocalFilter('sect', e.target.value || null)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Any</option>
              <option value="Sunni">Sunni</option>
              <option value="Shia">Shia</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-white/10 bg-slate-900">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-3 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-3 rounded-xl text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
