import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, SlidersHorizontal, Check, Info, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { FilterState } from '../types';
import { consolidatedDataset } from '../data';
import { motion, AnimatePresence } from 'motion/react';

interface SearchBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState, category?: 'material' | 'type' | 'search') => void;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState, category?: 'material' | 'type' | 'search') => void;
  totalFiltered: number;
  totalRaw: number;
  hasInteractedMaterial: boolean;
  hasInteractedType: boolean;
  onReset: () => void;
}

const MATERIALS = [
  { value: 'All', label: 'All Materials' },
  { value: 'Stainless Steel', label: 'Stainless' },
  { value: 'Carbon Steel', label: 'Carbon Steel' },
  { value: 'Alloy Steel', label: 'Alloy' },
  { value: 'Duplex Steel', label: 'Duplex' },
  { value: 'Super Duplex', label: 'Super Duplex' },
  { value: 'Titanium', label: 'Titanium' },
  { value: 'Mild Steel (MS)', label: 'Mild Steel' },
];

const ITEM_TYPES = [
  { value: 'All', label: 'All Shapes' },
  { value: 'Pipe', label: 'Pipes' },
  { value: 'Tube', label: 'Tubes' },
  { value: 'U-Tube', label: 'U-Tubes' },
  { value: 'Riffle Tube', label: 'Riffles' },
  { value: 'Finned Tube', label: 'Finned' },
  { value: 'Special Bends', label: 'Bends' },
];

// Helper to highlight matching text in suggestions
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => (
        regex.test(part) ? (
          <strong key={i} className="text-steel-600 dark:text-steel-400 font-bold bg-steel-100/80 dark:bg-steel-950/70 px-0.5 rounded-sm">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      ))}
    </span>
  );
}

export function SearchBar({ filters, onFilterChange }: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(filters.searchQuery);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync local query when parent/shortcut filters change
  useEffect(() => {
    setLocalQuery(filters.searchQuery);
  }, [filters.searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Pre-calculate autocomplete candidate terms from the actual dataset
  const autocompleteCandidates = useMemo(() => {
    const specs = new Set<string>();
    const grades = new Set<string>();
    const combos = new Set<string>();

    consolidatedDataset.forEach(item => {
      const spec = item.specification?.trim();
      const grade = item.grade?.trim();

      if (spec) {
        specs.add(spec);
      }
      if (grade) {
        grades.add(grade);
        const subGrades = grade.split(/[,/]/).map(g => g.trim()).filter(Boolean);
        subGrades.forEach(sg => {
          if (sg.toUpperCase() !== 'IBR') {
            grades.add(sg);
          }
        });
      }

      if (spec && grade) {
        combos.add(`${spec} ${grade}`);
      }
    });

    return {
      specs: Array.from(specs),
      grades: Array.from(grades),
      combos: Array.from(combos),
      all: Array.from(new Set([
        ...Array.from(specs),
        ...Array.from(grades),
        ...Array.from(combos)
      ]))
    };
  }, []);

  // Suggestions filtered based on local input text
  const suggestions = useMemo(() => {
    const query = localQuery.trim().toLowerCase();
    if (!query) return [];

    const filtered = autocompleteCandidates.all.filter(candidate => {
      return candidate.toLowerCase().includes(query);
    });

    return filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // 1. Exact match
      if (aLower === query) return -1;
      if (bLower === query) return 1;

      // 2. Starts with query
      const aStartsWith = aLower.startsWith(query);
      const bStartsWith = bLower.startsWith(query);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // 3. Word boundary starts with query
      const aWordStart = new RegExp(`\\b${query}`, 'i').test(aLower);
      const bWordStart = new RegExp(`\\b${query}`, 'i').test(bLower);
      if (aWordStart && !bWordStart) return -1;
      if (!aWordStart && bWordStart) return 1;

      return a.length - b.length;
    }).slice(0, 8); // Top 8 suggestions
  }, [localQuery, autocompleteCandidates]);

  // Contextual Dynamic Token Suggestions
  const dynamicTokenSuggestions = useMemo(() => {
    const query = localQuery.trim().toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);

    // If query is empty, suggest some popular initial starting tokens
    if (!query) {
      return [
        { label: 'ASTM A106', value: 'ASTM A106', type: 'spec' },
        { label: 'ASME SA210', value: 'ASME SA210', type: 'spec' },
        { label: 'ASME SA213', value: 'ASME SA213', type: 'spec' },
        { label: 'ASTM A312', value: 'ASTM A312', type: 'spec' },
        { label: 'Gr. B', value: 'Gr. B', type: 'grade' },
        { label: 'Gr. C', value: 'Gr. C', type: 'grade' },
        { label: 'TP304', value: 'TP304', type: 'grade' },
        { label: 'IBR', value: 'IBR', type: 'compliance' }
      ];
    }

    // Find items matching current query to extract complementary tokens
    const matchedItems = consolidatedDataset.filter(item => {
      const spec = (item.specification || '').toLowerCase();
      const grade = (item.grade || '').toLowerCase();
      const mat = (item.material || '').toLowerCase();
      
      return queryWords.every(word => {
        const nw = word.replace(/[-_.\s]/g, '');
        const ns = spec.replace(/[-_.\s]/g, '');
        const ng = grade.replace(/[-_.\s]/g, '');
        const nm = mat.replace(/[-_.\s]/g, '');

        return spec.includes(word) || grade.includes(word) || mat.includes(word) ||
               (nw.length > 0 && (ns.includes(nw) || ng.includes(nw) || nm.includes(nw)));
      });
    });

    // Gather tokens from matches
    const tokenFrequencies = new Map<string, { count: number; type: 'spec' | 'grade' | 'compliance' }>();

    matchedItems.forEach(item => {
      const spec = item.specification?.trim();
      if (spec) {
        tokenFrequencies.set(spec, {
          count: (tokenFrequencies.get(spec)?.count || 0) + 2.5,
          type: 'spec'
        });
        const specParts = spec.split(/\s+/);
        specParts.forEach(p => {
          if (p.length > 2 && !['ASTM', 'ASME', 'DIN', 'JIS'].includes(p.toUpperCase())) {
            tokenFrequencies.set(p, {
              count: (tokenFrequencies.get(p)?.count || 0) + 1,
              type: 'spec'
            });
          }
        });
      }

      const grade = item.grade?.trim();
      if (grade) {
        tokenFrequencies.set(grade, {
          count: (tokenFrequencies.get(grade)?.count || 0) + 2.5,
          type: 'grade'
        });
        const gradeParts = grade.split(/[,/]/).map(g => g.trim()).filter(Boolean);
        gradeParts.forEach(gp => {
          if (gp.length >= 2) {
            const type = gp.toUpperCase() === 'IBR' ? 'compliance' : 'grade';
            tokenFrequencies.set(gp, {
              count: (tokenFrequencies.get(gp)?.count || 0) + 1.5,
              type
            });
          }
        });
      }

      if (item.isIbr) {
        tokenFrequencies.set('IBR', {
          count: (tokenFrequencies.get('IBR')?.count || 0) + 1.5,
          type: 'compliance'
        });
      }
    });

    const suggestionsList: { label: string; value: string; type: 'spec' | 'grade' | 'compliance'; count: number }[] = [];

    tokenFrequencies.forEach((info, token) => {
      const tokenLower = token.toLowerCase();

      // Avoid suggesting tokens already present
      const isAlreadyInQuery = queryWords.some(qw => {
        const nqw = qw.replace(/[-_.\s]/g, '');
        const ntk = tokenLower.replace(/[-_.\s]/g, '');
        return qw === tokenLower || tokenLower.includes(qw) || (nqw.length > 0 && ntk.includes(nqw));
      });

      if (isAlreadyInQuery) return;
      if (['astm', 'asme', 'din', 'jis'].includes(tokenLower)) return;

      suggestionsList.push({
        label: token,
        value: token,
        type: info.type,
        count: info.count
      });
    });

    suggestionsList.sort((a, b) => b.count - a.count);
    return suggestionsList.slice(0, 6);
  }, [localQuery]);

  const handleSearchSubmit = () => {
    onFilterChange({ ...filters, searchQuery: localQuery }, 'search');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (showDropdown && activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[activeSuggestionIndex];
        setLocalQuery(selected);
        onFilterChange({ ...filters, searchQuery: selected }, 'search');
        setShowDropdown(false);
      } else {
        handleSearchSubmit();
        setShowDropdown(false);
      }
    } else if (e.key === 'ArrowDown') {
      if (showDropdown && suggestions.length > 0) {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (!showDropdown) {
        setShowDropdown(true);
      }
    } else if (e.key === 'ArrowUp') {
      if (showDropdown && suggestions.length > 0) {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleTokenClick = (tokenValue: string) => {
    let newQuery = localQuery.trim();
    if (newQuery) {
      newQuery = `${newQuery} ${tokenValue}`;
    } else {
      newQuery = tokenValue;
    }
    setLocalQuery(newQuery);
    onFilterChange({ ...filters, searchQuery: newQuery }, 'search');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-4">
      {/* Search Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="search-input" className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-bold">
            Search Spec & Grade (e.g. "A106 b")
          </label>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-sm font-mono">
            Press Enter or click Search
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1" ref={dropdownRef}>
            <input
              id="search-input"
              type="text"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                setShowDropdown(true);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => {
                setShowDropdown(true);
                setActiveSuggestionIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type e.g., 'A106 b', 'SA213 T91 IBR', 'TP304'..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-11 pr-16 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1.5 focus:ring-steel-500 focus:border-steel-500 transition-all font-sans"
              autoComplete="off"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery('');
                  onFilterChange({ ...filters, searchQuery: '' }, 'search');
                  setShowDropdown(false);
                }}
                className="absolute right-3 top-3 text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md transition-all font-mono"
              >
                Clear
              </button>
            )}

            {/* Autocomplete Dropdown overlay */}
            <AnimatePresence>
              {showDropdown && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.99 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto"
                >
                  <div className="p-1.5 space-y-0.5">
                    {suggestions.map((suggestion, idx) => {
                      const isActive = idx === activeSuggestionIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => {
                            // Prevent input blur before selecting
                            e.preventDefault();
                            setLocalQuery(suggestion);
                            onFilterChange({ ...filters, searchQuery: suggestion }, 'search');
                            setShowDropdown(false);
                          }}
                          onMouseEnter={() => setActiveSuggestionIndex(idx)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-sans flex items-center justify-between transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Search className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-steel-500' : 'text-slate-400'}`} />
                            <span className="font-medium">
                              <HighlightMatch text={suggestion} query={localQuery} />
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider scale-90">
                            {autocompleteCandidates.specs.includes(suggestion) ? 'Spec' : 
                             autocompleteCandidates.grades.includes(suggestion) ? 'Grade' : 'Combo'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            type="button"
            onClick={() => {
              handleSearchSubmit();
              setShowDropdown(false);
            }}
            className="px-5 py-3.5 bg-steel-600 hover:bg-steel-700 active:bg-steel-800 text-white font-semibold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Dynamic Token suggestions */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-steel-400" />
            <span>{localQuery.trim() ? 'Suggested Refinements:' : 'Popular Searches:'}</span>
          </span>
          {localQuery.trim() && (
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-sans italic">
              Click to append to search
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 font-sans">
          {dynamicTokenSuggestions.map((tag, idx) => {
            let badgeStyle = "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-850 dark:text-slate-300";
            if (tag.type === 'spec') {
              badgeStyle = "bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-850 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-300";
            } else if (tag.type === 'grade') {
              badgeStyle = "bg-purple-50/50 hover:bg-purple-50 border-purple-200 text-purple-850 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 dark:border-purple-900/40 dark:text-purple-300";
            } else if (tag.type === 'compliance') {
              badgeStyle = "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-850 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300";
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleTokenClick(tag.value)}
                className={`group text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer flex items-center space-x-1 ${badgeStyle}`}
                title={`Click to add ${tag.label} to query`}
              >
                <span className="font-mono text-[11px]">{tag.label}</span>
                <span className="opacity-45 group-hover:opacity-100 group-hover:text-steel-600 dark:group-hover:text-steel-400 transition-opacity text-[9px] font-bold">
                  +
                </span>
              </button>
            );
          })}
          {dynamicTokenSuggestions.length === 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
              No further suggestions found matching your query
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function FilterSidebar({
  filters,
  onFilterChange,
  totalFiltered,
  totalRaw,
  hasInteractedMaterial,
  hasInteractedType,
  onReset,
}: FilterSidebarProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.material !== 'All') count++;
    if (filters.itemType !== 'All') count++;
    if (filters.ibrOnly) count++;
    if (!filters.consolidate) count++;
    return count;
  }, [filters]);

  const handleMaterialSelect = (m: string) => {
    if (filters.material === m) {
      onFilterChange({ ...filters, material: 'All' }, 'material');
    } else {
      onFilterChange({ ...filters, material: m }, 'material');
    }
  };

  const handleTypeSelect = (t: string) => {
    if (filters.itemType === t) {
      onFilterChange({ ...filters, itemType: 'All' }, 'type');
    } else {
      onFilterChange({ ...filters, itemType: t }, 'type');
    }
  };

  const toggleIbr = () => {
    onFilterChange({ ...filters, ibrOnly: !filters.ibrOnly });
  };

  const toggleConsolidate = () => {
    onFilterChange({ ...filters, consolidate: !filters.consolidate });
  };

  const clearFilters = () => {
    onReset();
  };

  const filtersApplied = () => {
    return (
      filters.searchQuery !== '' ||
      hasInteractedMaterial ||
      hasInteractedType ||
      filters.ibrOnly === true ||
      filters.consolidate === false
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
      {/* Mobile/Tablet Collapsible Header */}
      <div className="flex items-center justify-between lg:hidden pb-1">
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="flex items-center space-x-2 text-slate-800 dark:text-slate-100 font-bold text-sm focus:outline-hidden"
        >
          <SlidersHorizontal className="w-4 h-4 text-steel-500" />
          <span>Advanced Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-steel-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="text-slate-400 hover:text-slate-600 focus:outline-hidden"
        >
          {isOpenMobile ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-steel-500" />
        <h3 className="text-sm font-display font-bold text-slate-850 dark:text-slate-50 uppercase tracking-wider">
          Filter Options
        </h3>
        {activeFiltersCount > 0 && (
          <span className="bg-steel-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {activeFiltersCount} active
          </span>
        )}
      </div>

      {/* Content wrapper - responsive collapse */}
      <div className={`${isOpenMobile ? 'block' : 'hidden'} lg:block space-y-5 mt-4 lg:mt-0`}>
        {/* Materials filter row */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-bold">Material Type</span>
          <div className="grid grid-cols-2 gap-1.5">
            {MATERIALS.map((mat) => {
              const isActive = mat.value === 'All'
                ? (hasInteractedMaterial && filters.material === 'All')
                : (filters.material === mat.value);
              return (
                <button
                  key={mat.value}
                  onClick={() => handleMaterialSelect(mat.value)}
                  className={`px-2.5 py-2 text-left text-xs rounded-lg transition-all duration-200 cursor-pointer border ${
                    isActive
                      ? 'bg-steel-500 text-white font-semibold shadow-xs border-steel-600'
                      : 'bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {mat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Types selector */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-bold">Item Shape/Type</span>
          <div className="grid grid-cols-2 gap-1.5">
            {ITEM_TYPES.map((type) => {
              const isActive = type.value === 'All'
                ? (hasInteractedType && filters.itemType === 'All')
                : (filters.itemType === type.value);
              return (
                <button
                  key={type.value}
                  onClick={() => handleTypeSelect(type.value)}
                  className={`px-2.5 py-2 text-left text-xs rounded-lg transition-all duration-200 cursor-pointer border ${
                    isActive
                      ? 'bg-steel-700 text-white dark:bg-slate-250 dark:text-slate-900 font-semibold border-steel-800'
                      : 'bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles Panel */}
        <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">IBR Certified Only</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight">High pressure boiler compliance</span>
            </div>
            <button
              onClick={toggleIbr}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                filters.ibrOnly ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
              id="ibr-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  filters.ibrOnly ? 'transform translate-x-4' : ''
                }`}
              />
            </button>
          </div>

          <div className="border-t border-slate-200/60 dark:border-slate-800/60 my-1"></div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Consolidate Duplicates</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight">Group identical spreadsheet rows</span>
            </div>
            <button
              onClick={toggleConsolidate}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                filters.consolidate ? 'bg-steel-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
              id="consolidate-toggle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  filters.consolidate ? 'transform translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Diagnostics / Applied Filters Status bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col space-y-3 text-xs text-slate-500 font-sans">
          <div className="flex items-start space-x-1.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-steel-400 shrink-0 mt-0.5" />
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200">{totalFiltered}</strong> unique items
              {filters.consolidate ? ' compiled from ' : ' representing '}
              <strong className="text-slate-800 dark:text-slate-200">{totalRaw}</strong> original rows.
            </span>
          </div>
          
          {filtersApplied() && (
            <button
              onClick={clearFilters}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg font-mono font-medium flex items-center justify-center space-x-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Search & Filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
