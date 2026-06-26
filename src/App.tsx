import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Layers, 
  Flame, 
  HelpCircle, 
  FileText, 
  CheckCircle2, 
  Award,
  ChevronRight,
  Printer,
  Compass,
  ArrowUpDown,
  BookOpen,
  X,
  Shield,
  ShieldAlert,
  LogOut,
  Settings,
  LayoutGrid
} from 'lucide-react';
import { FilterState, ConsolidateItem, ActivityLog } from './types';
import { consolidatedDataset, searchPipeItems, pipeItems, getSearchRelevanceScore } from './data';
import { SearchBar, FilterSidebar } from './components/FilterPanel';
import ItemRow from './components/ItemRow';
import DetailsModal from './components/DetailsModal';
import Logo from './components/Logo';
import LoginModal from './components/LoginModal';
import AdminPanel from './components/AdminPanel';
import { initializeVisitorTracking, logVisitorAction } from './lib/firebase';

export default function App() {
  // State for search queries and filter choices
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    material: 'All',
    itemType: 'All',
    ibrOnly: false,
    consolidate: true,
  });

  // Dynamic persistent dataset
  const [dataset, setDataset] = useState<ConsolidateItem[]>(() => {
    const saved = localStorage.getItem('materials_desk_dataset');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seenIds = new Set<string>();
          return parsed.map((item, idx) => {
            let uniqueId = item.id;
            if (!uniqueId || seenIds.has(uniqueId)) {
              uniqueId = `pipe-fixed-${idx}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            }
            seenIds.add(uniqueId);
            return {
              ...item,
              id: uniqueId
            };
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return consolidatedDataset;
  });

  // Admin access states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('materials_desk_admin_logged_in') === 'true';
  });
  const [adminViewActive, setAdminViewActive] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showWelcomeToast, setShowWelcomeToast] = useState<boolean>(false);
  
  // Activity logging state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('materials_desk_activity_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seenIds = new Set<string>();
          return parsed.map((log, idx) => {
            let logId = log.id;
            if (!logId || seenIds.has(logId)) {
              logId = `log-fixed-${idx}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            }
            seenIds.add(logId);
            return {
              ...log,
              id: logId
            };
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Save activity logs to localStorage on change
  useEffect(() => {
    localStorage.setItem('materials_desk_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  // Handler to update the dataset globally and save it with strict unique ID sanitization
  const handleUpdateDataset = (newDataset: ConsolidateItem[]) => {
    const seenIds = new Set<string>();
    const sanitizedDataset = newDataset.map((item, idx) => {
      let uniqueId = item.id;
      if (!uniqueId || seenIds.has(uniqueId)) {
        uniqueId = `pipe-fixed-${idx}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      }
      seenIds.add(uniqueId);
      return {
        ...item,
        id: uniqueId
      };
    });
    setDataset(sanitizedDataset);
    localStorage.setItem('materials_desk_dataset', JSON.stringify(sanitizedDataset));
  };

  // Helper to add activity log
  const handleAddActivityLog = (
    action: 'add' | 'edit' | 'delete' | 'reset',
    item: Partial<ConsolidateItem>
  ) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      action,
      itemName: item.itemName || '',
      specification: item.specification || '',
      grade: item.grade || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 50)); // cap at 50 logs for cleanliness
  };

  // State for tracking why they were logged out
  const [logoutReason, setLogoutReason] = useState<'session' | 'afk' | null>(null);

  // Initialize Real-time Visitor Session & Active Activity Heartbeats
  useEffect(() => {
    initializeVisitorTracking();
  }, []);

  // Log search queries after a 1.5s debounce to avoid flooding
  useEffect(() => {
    const queryStr = filters.searchQuery.trim();
    if (!queryStr) return;

    const timer = setTimeout(() => {
      logVisitorAction(`Searched "${queryStr}"`, 'search');
    }, 1500);

    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // Admin authentication handlers
  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('materials_desk_admin_logged_in', 'true');
    localStorage.setItem('materials_desk_admin_login_time', Date.now().toString());
    localStorage.setItem('materials_desk_admin_last_active', Date.now().toString());
    setAdminViewActive(true);
    handleAddActivityLog('reset', { itemName: 'Admin Logged In Successfully' });
    setShowWelcomeToast(true);
    setLogoutReason(null);
  };

  useEffect(() => {
    if (showWelcomeToast) {
      const timer = setTimeout(() => {
        setShowWelcomeToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeToast]);

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.setItem('materials_desk_admin_logged_in', 'false');
    localStorage.removeItem('materials_desk_admin_login_time');
    localStorage.removeItem('materials_desk_admin_last_active');
    setAdminViewActive(false);
  };

  // Automatically logout after 30 minutes of session or 5 minutes of inactivity (AFK)
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    // Set fallback timestamps if not already present
    if (!localStorage.getItem('materials_desk_admin_login_time')) {
      localStorage.setItem('materials_desk_admin_login_time', Date.now().toString());
    }
    if (!localStorage.getItem('materials_desk_admin_last_active')) {
      localStorage.setItem('materials_desk_admin_last_active', Date.now().toString());
    }

    // Capture activity to reset AFK timer
    const handleActivity = () => {
      localStorage.setItem('materials_desk_admin_last_active', Date.now().toString());
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'click', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    const checkTimers = () => {
      const now = Date.now();
      const loginTime = Number(localStorage.getItem('materials_desk_admin_login_time') || now);
      const lastActive = Number(localStorage.getItem('materials_desk_admin_last_active') || now);

      const sessionLimitMs = 30 * 60 * 1000; // 30 minutes
      const afkLimitMs = 5 * 60 * 1000; // 5 minutes (afk timeout)

      if (now - loginTime > sessionLimitMs) {
        handleLogout();
        setLogoutReason('session');
        return true;
      } else if (now - lastActive > afkLimitMs) {
        handleLogout();
        setLogoutReason('afk');
        return true;
      }
      return false;
    };

    // Run immediately
    const wasLoggedOut = checkTimers();
    if (wasLoggedOut) return;

    // Check periodically
    const interval = setInterval(() => {
      checkTimers();
    }, 2000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [isAdminLoggedIn]);

  // Automatically clear logout toast after 8 seconds
  useEffect(() => {
    if (logoutReason) {
      const timer = setTimeout(() => {
        setLogoutReason(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [logoutReason]);

  // Track if user has interacted with specific filter categories
  const [hasInteractedMaterial, setHasInteractedMaterial] = useState(false);
  const [hasInteractedType, setHasInteractedType] = useState(false);
  const [hasInteractedSearch, setHasInteractedSearch] = useState(false);

  // Log active filter changes
  useEffect(() => {
    if (filters.material !== 'All' && hasInteractedMaterial) {
      logVisitorAction(`Filtered material by "${filters.material}"`, 'filter');
    }
  }, [filters.material, hasInteractedMaterial]);

  useEffect(() => {
    if (filters.itemType !== 'All' && hasInteractedType) {
      logVisitorAction(`Filtered product type by "${filters.itemType}"`, 'filter');
    }
  }, [filters.itemType, hasInteractedType]);

  useEffect(() => {
    if (filters.ibrOnly) {
      logVisitorAction(`Enabled IBR Approved filter`, 'filter');
    }
  }, [filters.ibrOnly]);

  // Active filter change handler
  const handleFilterChange = (
    newFilters: FilterState,
    category?: 'material' | 'type' | 'search'
  ) => {
    if (category === 'material') {
      setHasInteractedMaterial(true);
    } else if (category === 'type') {
      setHasInteractedType(true);
    } else if (category === 'search') {
      setHasInteractedSearch(true);
    } else {
      // Fallback: detect what changed if category is not provided
      if (newFilters.material !== filters.material) {
        setHasInteractedMaterial(true);
      }
      if (newFilters.itemType !== filters.itemType) {
        setHasInteractedType(true);
      }
      if (newFilters.searchQuery !== filters.searchQuery) {
        setHasInteractedSearch(true);
      }
    }
    setFilters(newFilters);
  };

  // Full reset handler
  const resetAll = () => {
    setFilters({
      searchQuery: '',
      material: 'All',
      itemType: 'All',
      ibrOnly: false,
      consolidate: true,
    });
    setHasInteractedMaterial(false);
    setHasInteractedType(false);
    setHasInteractedSearch(false);
  };

  // State for opening the slide-over details panel
  const [selectedItem, setSelectedItem] = useState<ConsolidateItem | null>(null);

  // State for active privacy, terms, or copyright dialog
  const [activePolicy, setActivePolicy] = useState<'privacy' | 'terms' | 'copyright' | null>(null);

  // State for sorting criteria
  const [sortBy, setSortBy] = useState<'spec' | 'count' | 'material'>('spec');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Compute dataset-wide statistics
  const stats = useMemo(() => {
    const totalOriginalRows = dataset.reduce((sum, item) => sum + item.count, 0);
    const uniqueSpecs = new Set(dataset.map(item => item.specification).filter(Boolean)).size;
    const uniqueGrades = new Set(dataset.map(item => item.grade).filter(Boolean)).size;
    const totalDuplicatesCount = totalOriginalRows - dataset.length;

    // Count pipes and tubes separately
    let pipeCount = 0;
    let tubeCount = 0;
    dataset.forEach(item => {
      const name = (item.itemName || '').toLowerCase();
      if (name.includes('pipe')) {
        pipeCount++;
      } else {
        tubeCount++;
      }
    });

    return {
      totalOriginalRows,
      uniqueProfilesCount: dataset.length,
      uniqueSpecs,
      uniqueGrades,
      totalDuplicatesCount,
      pipeCount,
      tubeCount
    };
  }, [dataset]);

  // Check if user has actively searched or filtered for items
  const isSearchOrFilterActive = useMemo(() => {
    return (
      filters.searchQuery.trim() !== '' ||
      hasInteractedMaterial ||
      hasInteractedType ||
      filters.ibrOnly === true
    );
  }, [filters.searchQuery, filters.ibrOnly, hasInteractedMaterial, hasInteractedType]);

  // Filter the dataset based on current search & dropdown selections
  const filteredItems = useMemo(() => {
    if (!isSearchOrFilterActive) {
      return [];
    }

    // Search and filter consolidated unique dataset
    const results = searchPipeItems(
      dataset,
      filters.searchQuery,
      filters.material,
      filters.itemType,
      filters.ibrOnly
    );

    // If consolidation is turned off, flat map items to represent duplicates individually
    let finalResults: ConsolidateItem[] = [];
    if (!filters.consolidate) {
      results.forEach((item) => {
        // Create duplicate simulation rows based on its frequency count
        for (let i = 0; i < item.count; i++) {
          finalResults.push({
            ...item,
            id: `${item.id}-dup-${i}`,
            count: 1 // Single instance
          });
        }
      });
    } else {
      finalResults = results;
    }

    // Apply sorting
    finalResults.sort((a, b) => {
      // If there is an active search query, prioritize sorting by relevance score descending
      const query = filters.searchQuery.trim();
      if (query) {
        const scoreA = getSearchRelevanceScore(a, query);
        const scoreB = getSearchRelevanceScore(b, query);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Descending order (highest relevance first)
        }
      }

      let valA = '';
      let valB = '';

      if (sortBy === 'spec') {
        valA = a.specification || 'ZZZ';
        valB = b.specification || 'ZZZ';
      } else if (sortBy === 'material') {
        valA = a.material;
        valB = b.material;
      } else if (sortBy === 'count') {
        // Numeric sort
        const numA = a.count;
        const numB = b.count;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return finalResults;
  }, [isSearchOrFilterActive, filters, sortBy, sortOrder, dataset]);

  const toggleSort = (field: 'spec' | 'count' | 'material') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 steel-grid-bg transition-colors pb-24 font-sans">
      
      {/* Header section */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 dark:bg-slate-900 flex items-center justify-center shadow-md border border-slate-200/10">
              <Logo className="w-6.5 h-6.5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-mono font-bold text-slate-400 block -mb-0.5">Materials Desk</span>
              <h1 className="text-base font-display font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Pipe & Tube Finder
              </h1>
            </div>
          </div>

          {/* Admin panel triggers */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {isAdminLoggedIn ? (
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* View toggle */}
                <button
                  onClick={() => setAdminViewActive(!adminViewActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 border cursor-pointer ${
                    adminViewActive 
                      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-250 dark:border-slate-700 text-slate-800 dark:text-slate-100' 
                      : 'bg-slate-950 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 border-transparent text-white dark:text-slate-950 shadow-sm'
                  }`}
                  id="admin-toggle-view"
                >
                  {adminViewActive ? (
                    <>
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Public App</span>
                    </>
                  ) : (
                    <>
                      <Settings className="w-3.5 h-3.5" />
                      <span>Console</span>
                    </>
                  )}
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                  title="Sign out of administration session"
                  id="admin-logout-button"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center space-x-1 cursor-pointer"
                id="admin-login-button"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {adminViewActive ? (
          <AdminPanel
            dataset={dataset}
            onUpdateDataset={handleUpdateDataset}
            activityLogs={activityLogs}
            onAddActivityLog={handleAddActivityLog}
            onClose={() => setAdminViewActive(false)}
          />
        ) : (
          <>
            {/* Visual Steel Dashboard Metrics Bar */}
            <section className="space-y-4" id="dashboard-metrics">
              {/* Top Row: Pipe & Tube entries side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Pipe Entries */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                  <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform text-slate-600 dark:text-slate-300">
                    <Layers className="w-12 h-12" />
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Pipe Entries</span>
                  <span className="text-2xl font-display font-bold text-slate-950 dark:text-slate-100 block mt-1">
                    {stats.pipeCount}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-sans">Total distinct pipe catalog items</span>
                </div>

                {/* Tube Entries */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                  <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform text-slate-600 dark:text-slate-300">
                    <Layers className="w-12 h-12" />
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Tube Entries</span>
                  <span className="text-2xl font-display font-bold text-slate-950 dark:text-slate-100 block mt-1">
                    {stats.tubeCount}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-sans">Total distinct tube catalog items</span>
                </div>
              </div>

              {/* Bottom Row: Standards and High-Temp Grades */}
              <div className="grid grid-cols-2 gap-4">
                {/* Unique Standards */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                  <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform text-slate-600 dark:text-slate-300">
                    <BookOpen className="w-12 h-12" />
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Standards Code</span>
                  <span className="text-2xl font-display font-bold text-steel-500 block mt-1">
                    {stats.uniqueSpecs}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-sans">Distinct specification codes</span>
                </div>

                {/* High-Temp Grades */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
                  <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform text-slate-600 dark:text-slate-300">
                    <Flame className="w-12 h-12" />
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">High-Temp Grades</span>
                  <span className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                    {stats.uniqueGrades}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block font-sans">Unique alloy variations</span>
                </div>
              </div>
            </section>

            {/* Prominent Search Bar on top of catalog/filters */}
            <section>
              <SearchBar
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </section>

            {/* Layout Grid: Left Sidebar for filters, Right content for matching catalog */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Filter Sidebar */}
              <aside className="lg:col-span-4">
                <FilterSidebar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  totalFiltered={filteredItems.length}
                  totalRaw={filteredItems.reduce((sum, item) => sum + item.count, 0)}
                  hasInteractedMaterial={hasInteractedMaterial}
                  hasInteractedType={hasInteractedType}
                  onReset={resetAll}
                />
              </aside>

              {/* Right Column: Matching Pipe & Tube Catalog */}
              <section className="lg:col-span-8 space-y-4" id="catalog-section">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/50 dark:border-slate-800/80 pb-3 gap-3">
                  <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-slate-50 flex items-center space-x-2">
                    <Compass className="w-5 h-5 text-steel-500 shrink-0" />
                    <span>Matching Pipe & Tube Catalog</span>
                  </h2>
                  
                  {/* Sorting controls */}
                  {isSearchOrFilterActive && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-200">
                      <span className="text-slate-400 mr-1 hidden sm:inline">Sort by:</span>
                      <button 
                        onClick={() => toggleSort('spec')}
                        className={`px-2.5 py-1.5 rounded-md border flex items-center space-x-1 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                          sortBy === 'spec' ? 'border-steel-300 bg-steel-50/50 text-steel-700 dark:bg-slate-900 dark:border-slate-700 font-semibold' : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Code Standard</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => toggleSort('count')}
                        className={`px-2.5 py-1.5 rounded-md border flex items-center space-x-1 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                          sortBy === 'count' ? 'border-steel-300 bg-steel-50/50 text-steel-700 dark:bg-slate-900 dark:border-slate-700 font-semibold' : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Occurrences</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => toggleSort('material')}
                        className={`px-2.5 py-1.5 rounded-md border flex items-center space-x-1 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
                          sortBy === 'material' ? 'border-steel-300 bg-steel-50/50 text-steel-700 dark:bg-slate-900 dark:border-slate-700 font-semibold' : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Material</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Results list mapping */}
                <div className="space-y-2.5 min-h-36 font-sans">
                  {!isSearchOrFilterActive ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 bg-white dark:bg-slate-900/40">
                      <Compass className="w-12 h-12 text-steel-500/60 mx-auto animate-pulse" />
                      <h3 className="font-display font-extrabold text-slate-800 dark:text-slate-100 text-base">
                        Search or Filter to Explore Catalog
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md mx-auto leading-relaxed">
                        The pipe and tube database is currently loaded and offline-ready. Enter a standard/grade code above (e.g., <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-steel-600 dark:text-steel-400">A106</span>, <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-steel-600 dark:text-steel-400">TP304</span>, or <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-steel-600 dark:text-steel-400">DIN 1629</span>), or select specific materials and shapes in the sidebar to display matched pipeline specifications.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Try quick searches:</span>
                        <button 
                          onClick={() => handleFilterChange({ ...filters, searchQuery: 'A106 b' })}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-md transition-colors font-mono cursor-pointer border border-slate-200/50 dark:border-slate-750"
                        >
                          A106 b
                        </button>
                        <button 
                          onClick={() => handleFilterChange({ ...filters, searchQuery: 'SA213 T91' })}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-md transition-colors font-mono cursor-pointer border border-slate-200/50 dark:border-slate-750"
                        >
                          SA213 T91
                        </button>
                        <button 
                          onClick={() => handleFilterChange({ ...filters, searchQuery: 'DIN 1629' })}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-md transition-colors font-mono cursor-pointer border border-slate-200/50 dark:border-slate-750"
                        >
                          DIN 1629
                        </button>
                        <button 
                          onClick={() => handleFilterChange({ ...filters, material: 'Stainless Steel' })}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-md transition-colors font-mono cursor-pointer border border-slate-200/50 dark:border-slate-750"
                        >
                          Stainless Steel
                        </button>
                      </div>
                    </div>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        searchQuery={filters.searchQuery}
                        onSelect={(item) => {
                          setSelectedItem(item);
                          logVisitorAction(`Viewed "${item.itemName} - ${item.specification} ${item.grade}"`, 'view');
                        }}
                        isConsolidated={filters.consolidate}
                      />
                    ))
                  ) : (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 bg-white dark:bg-slate-900/40">
                      <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm">
                        No specifications match your search query
                      </h3>
                      <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto leading-relaxed">
                        Try typing portions of code like <span className="font-mono">"A106"</span>, <span className="font-mono">"316L"</span>, or clicking the pre-built fuzzy search shortcuts above to check the results.
                      </p>
                      <button
                        onClick={resetAll}
                        className="text-xs text-steel-500 dark:text-steel-400 font-semibold underline hover:text-steel-700 cursor-pointer"
                      >
                        Clear filters and search query
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Technical Guidance & FAQs Section */}
            <section className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
              
              <div className="space-y-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center space-x-2 text-steel-600 dark:text-steel-400">
                  <Award className="w-4 h-4 shrink-0" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">ASTM vs. ASME Specifications</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <strong>ASTM</strong> codes represent material test standards, while <strong>ASME</strong> codes represent pressure piping design requirements. Commonly, an ASME code (e.g. <em>SA213</em>) is physically identical to the corresponding ASTM code (e.g. <em>A213</em>) but carries formal certification for boiler use.
                </p>
              </div>

              <div className="space-y-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center space-x-2 text-rose-500">
                  <Flame className="w-4 h-4 shrink-0" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">What is IBR Certification?</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <strong>IBR</strong> stands for Indian Boiler Regulations. Tubes and pipes bearing the <em>IBR</em> grade suffix have undergone hydrostatic, tensile, and chemical tests audited by certified inspectors to guarantee resistance to steam pressures exceeding 1.0 MPa (10 kgf/cm²).
                </p>
              </div>

              <div className="space-y-2 p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">How to read Alloy Suffixes</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Suffixes like <strong>L</strong> (e.g., <em>316L</em>) denote low carbon content to protect weld margins from corrosion. Suffixes like <strong>H</strong> (e.g., <em>304H</em>) denote high carbon content for superior tensile performance at extreme furnace heats.
                </p>
              </div>

            </section>
          </>
        )}
      </main>

      {/* Footer copyright section */}
      <footer className="mt-16 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400 dark:text-slate-500">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setActivePolicy('copyright')}
              className="hover:text-steel-600 dark:hover:text-steel-400 transition-colors cursor-pointer text-left underline decoration-dotted underline-offset-4"
              title="View copyright policy details"
            >
              © {new Date().getFullYear()} Dharmit. All rights reserved.
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActivePolicy('privacy')}
              className="hover:text-steel-600 dark:hover:text-steel-400 transition-colors cursor-pointer underline decoration-dotted underline-offset-4"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button 
              onClick={() => setActivePolicy('terms')}
              className="hover:text-steel-600 dark:hover:text-steel-400 transition-colors cursor-pointer underline decoration-dotted underline-offset-4"
            >
              Terms of Service
            </button>
            <span>•</span>
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              v1.0.3
            </span>
          </div>
        </div>
      </footer>

      {/* Policy Details Modal (Privacy, Terms, and Copyright info dialog) */}
      {activePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setActivePolicy(null)}
          />

          {/* Modal Container */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 transform transition-all z-10 animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-steel-500" />
                <span>
                  {activePolicy === 'privacy' && 'Privacy Policy'}
                  {activePolicy === 'terms' && 'Terms & Conditions'}
                  {activePolicy === 'copyright' && 'Copyright & All Rights Reserved'}
                </span>
              </h3>
              <button 
                onClick={() => setActivePolicy(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans">
              {activePolicy === 'privacy' && (
                <>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Basic Privacy Commitments:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Strict Offline-First:</strong> All catalog searching, specification matching, and data lookups happen in-browser. We do not transmit your inputs.
                    </li>
                    <li>
                      <strong>Zero Tracking:</strong> No analytical beacons, heatmaps, or third-party cookies are integrated, protecting corporate procurement activities.
                    </li>
                    <li>
                      <strong>No Account Registration:</strong> No sign-ups or personal logs are required to access standard ASTM, ASME, and IBR data.
                    </li>
                  </ul>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2">
                    Maintained by Dharmit. Last Updated: June 2026.
                  </p>
                </>
              )}

              {activePolicy === 'terms' && (
                <>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    Basic Terms of Service Points:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Engineering Reference Tool:</strong> Catalog specifications and alloy calculations are compiled for informational and planning purposes only.
                    </li>
                    <li>
                      <strong>Mandatory Verification:</strong> Users are requested to cross-verify all material parameters with official ASTM/ASME/IBR books prior to industrial deployment.
                    </li>
                    <li>
                      <strong>No Liability:</strong> Neither the developer nor Dharmit shall be held liable for hardware, pressure rating, or industrial issues arising from interpretation.
                    </li>
                  </ul>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2">
                    Provided as-is without warranting 100% real-time accuracy.
                  </p>
                </>
              )}

              {activePolicy === 'copyright' && (
                <>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    All Rights Reserved Statement:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Property Rights:</strong> All visual structures, custom layouts, and clean compiled databases in this application are owned by <strong>Dharmit</strong>.
                    </li>
                    <li>
                      <strong>Authorized Usage:</strong> You are fully authorized to copy specification standards, grade symbols, and ERP text segments for commercial orders.
                    </li>
                    <li>
                      <strong>Restricted Actions:</strong> Mass scrapers, database clones, or verbatim replication of the interface for resell purposes is strictly prohibited.
                    </li>
                  </ul>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    © {new Date().getFullYear()} Dharmit. Standard intellectual property protections apply.
                  </p>
                </>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-5 pt-3 border-t border-slate-150 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActivePolicy(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over selected item details modal */}
      <DetailsModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Admin Login Dialog */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Welcome Toast Notification */}
      <AnimatePresence>
        {showWelcomeToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, x: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-4 right-4 z-50 flex items-center space-x-3.5 bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl px-4 py-3.5 shadow-xl max-w-sm font-sans"
            id="welcome-toast-popup"
          >
            {/* Left accent indicator */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                Welcome, Dharmit 👋
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                You have successfully signed in as Administrator.
              </p>
            </div>

            <button
              onClick={() => setShowWelcomeToast(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Logout Notification Toast */}
      <AnimatePresence>
        {logoutReason && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, x: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-4 right-4 z-50 flex items-center space-x-3.5 bg-white dark:bg-slate-900 border border-amber-550/30 dark:border-amber-550/20 rounded-2xl px-4 py-3.5 shadow-xl max-w-sm font-sans"
            id="logout-toast-popup"
          >
            {/* Left accent indicator */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                Session Terminated 🔒
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                {logoutReason === 'session' 
                  ? 'Admin logged out automatically after 30 minutes session limit.'
                  : 'Logged out automatically due to inactivity (AFK).'}
              </p>
            </div>

            <button
              onClick={() => setLogoutReason(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
