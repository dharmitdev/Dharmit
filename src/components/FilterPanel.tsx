import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, Check, Info, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { FilterState } from '../types';

interface SearchBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalFiltered: number;
  totalRaw: number;
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

const QUICK_SPEC_SHORTCUTS = [
  { label: 'A106 b', query: 'A106 b', desc: 'Fuzzy match search sample' },
  { label: 'A106 B IBR', query: 'A106 B IBR', desc: 'Double grade search sample' },
  { label: 'A312 TP304', query: 'A312 TP304', desc: 'Stainless pipe spec' },
  { label: 'SA213 T91 IBR', query: 'SA213 T91 IBR', desc: 'Alloy tube & compliance' },
  { label: 'S32205', query: 'S32205', desc: 'Duplex standard' },
  { label: 'SA179', query: 'SA179', desc: 'Carbon heat-exchanger' },
];

export function SearchBar({ filters, onFilterChange }: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(filters.searchQuery);

  // Sync local query when parent/shortcut filters change
  useEffect(() => {
    setLocalQuery(filters.searchQuery);
  }, [filters.searchQuery]);

  const handleSearchSubmit = () => {
    onFilterChange({ ...filters, searchQuery: localQuery });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleShortcutClick = (query: string) => {
    setLocalQuery(query);
    onFilterChange({ ...filters, searchQuery: query });
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
          <div className="relative flex-1">
            <input
              id="search-input"
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type e.g., 'A106 b', 'SA213 T91 IBR', 'TP304'..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-11 pr-16 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-steel-500 focus:border-steel-500 transition-all font-sans"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery('');
                  onFilterChange({ ...filters, searchQuery: '' });
                }}
                className="absolute right-3 top-3 text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md transition-all font-mono"
              >
                Clear
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="px-5 py-3.5 bg-steel-600 hover:bg-steel-700 active:bg-steel-800 text-white font-semibold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Quick Search shortcuts requested by user */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-steel-400" />
            <span>Click to test fuzzy specifications search:</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 font-sans">
          {QUICK_SPEC_SHORTCUTS.map((tag, idx) => (
            <button
              key={idx}
              onClick={() => handleShortcutClick(tag.query)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                filters.searchQuery.toLowerCase() === tag.query.toLowerCase()
                  ? 'bg-steel-800 text-white border-steel-900 dark:bg-steel-400 dark:text-slate-950 dark:border-steel-300 font-semibold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-950 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-[11px]'
              }`}
              title={tag.desc}
            >
              <span className="font-mono">{tag.label}</span>
            </button>
          ))}
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
    onFilterChange({ ...filters, material: m });
  };

  const handleTypeSelect = (t: string) => {
    onFilterChange({ ...filters, itemType: t });
  };

  const toggleIbr = () => {
    onFilterChange({ ...filters, ibrOnly: !filters.ibrOnly });
  };

  const toggleConsolidate = () => {
    onFilterChange({ ...filters, consolidate: !filters.consolidate });
  };

  const clearFilters = () => {
    onFilterChange({
      searchQuery: '',
      material: 'All',
      itemType: 'All',
      ibrOnly: false,
      consolidate: true,
    });
  };

  const filtersApplied = () => {
    return (
      filters.searchQuery !== '' ||
      filters.material !== 'All' ||
      filters.itemType !== 'All' ||
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
            {MATERIALS.map((mat) => (
              <button
                key={mat.value}
                onClick={() => handleMaterialSelect(mat.value)}
                className={`px-2.5 py-2 text-left text-xs rounded-lg transition-all duration-200 cursor-pointer border ${
                  filters.material === mat.value
                    ? 'bg-steel-500 text-white font-semibold shadow-xs border-steel-600'
                    : 'bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
                }`}
              >
                {mat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Types selector */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-bold">Item Shape/Type</span>
          <div className="grid grid-cols-2 gap-1.5">
            {ITEM_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeSelect(type.value)}
                className={`px-2.5 py-2 text-left text-xs rounded-lg transition-all duration-200 cursor-pointer border ${
                  filters.itemType === type.value
                    ? 'bg-steel-700 text-white dark:bg-slate-250 dark:text-slate-900 font-semibold border-steel-800'
                    : 'bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
                }`}
              >
                {type.label}
              </button>
            ))}
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
