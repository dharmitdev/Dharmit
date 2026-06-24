import { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { FilterState, ConsolidateItem } from './types';
import { consolidatedDataset, searchPipeItems, pipeItems } from './data';
import { SearchBar, FilterSidebar } from './components/FilterPanel';
import ItemRow from './components/ItemRow';
import DetailsModal from './components/DetailsModal';

export default function App() {
  // State for search queries and filter choices
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    material: 'All',
    itemType: 'All',
    ibrOnly: false,
    consolidate: true,
  });

  // State for opening the slide-over details panel
  const [selectedItem, setSelectedItem] = useState<ConsolidateItem | null>(null);

  // State for active privacy, terms, or copyright dialog
  const [activePolicy, setActivePolicy] = useState<'privacy' | 'terms' | 'copyright' | null>(null);

  // State for sorting criteria
  const [sortBy, setSortBy] = useState<'spec' | 'count' | 'material'>('spec');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Compute dataset-wide statistics
  const stats = useMemo(() => {
    const totalOriginalRows = consolidatedDataset.reduce((sum, item) => sum + item.count, 0);
    const uniqueSpecs = new Set(consolidatedDataset.map(item => item.specification).filter(Boolean)).size;
    const uniqueGrades = new Set(consolidatedDataset.map(item => item.grade).filter(Boolean)).size;
    const totalDuplicatesCount = totalOriginalRows - consolidatedDataset.length;

    return {
      totalOriginalRows,
      uniqueProfilesCount: consolidatedDataset.length,
      uniqueSpecs,
      uniqueGrades,
      totalDuplicatesCount
    };
  }, []);

  // Filter the dataset based on current search & dropdown selections
  const filteredItems = useMemo(() => {
    // Search and filter consolidated unique dataset
    const results = searchPipeItems(
      consolidatedDataset,
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
  }, [filters, sortBy, sortOrder]);

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
            <div className="w-9 h-9 rounded-xl bg-steel-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 shadow-md">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-mono font-bold text-slate-400 block -mb-0.5">Materials Desk</span>
              <h1 className="text-base font-display font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                Pipe & Tube Finder
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* Visual Steel Dashboard Metrics Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4" id="dashboard-metrics">
          {/* Total Original Entries */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform text-slate-600 dark:text-slate-300">
              <FileSpreadsheet className="w-12 h-12" />
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Spreadsheet Rows</span>
            <span className="text-2xl font-display font-bold text-slate-950 dark:text-slate-100 block mt-1">
              {stats.totalOriginalRows}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-sans">Total inputs loaded</span>
          </div>

          {/* Duplicates consolidated */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
            <div className="absolute right-3 top-3 opacity-10 group-hover:scale-110 transition-transform text-slate-600 dark:text-slate-300">
              <Layers className="w-12 h-12" />
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Duplicates Filtered</span>
            <span className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400 block mt-1">
              {stats.totalDuplicatesCount}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-sans">Redundant rows removed</span>
          </div>

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

          {/* IBR Certified */}
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
        </section>

        {/* Prominent Search Bar on top of catalog/filters */}
        <section>
          <SearchBar
            filters={filters}
            onFilterChange={setFilters}
          />
        </section>

        {/* Layout Grid: Left Sidebar for filters, Right content for matching catalog */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Filter Sidebar */}
          <aside className="lg:col-span-4">
            <FilterSidebar
              filters={filters}
              onFilterChange={setFilters}
              totalFiltered={filteredItems.length}
              totalRaw={filteredItems.reduce((sum, item) => sum + item.count, 0)}
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
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
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
            </div>

            {/* Results list mapping */}
            <div className="space-y-2.5 min-h-36">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    searchQuery={filters.searchQuery}
                    onSelect={setSelectedItem}
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
                    onClick={() => setFilters({ ...filters, searchQuery: '', material: 'All', itemType: 'All', ibrOnly: false })}
                    className="text-xs text-steel-500 dark:text-steel-400 font-semibold underline hover:text-steel-700"
                  >
                    Reset filters and show all items
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
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 transform transition-all z-10 animate-in fade-in zoom-in-95 duration-200">
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
                <X className="w-4 h-4" />
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
    </div>
  );
}
