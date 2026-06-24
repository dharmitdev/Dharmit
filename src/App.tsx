import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Layers, 
  Flame, 
  Download, 
  HelpCircle, 
  FileText, 
  CheckCircle2, 
  Award,
  ChevronRight,
  Printer,
  Compass,
  ArrowUpDown,
  BookOpen
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

  // Helper to export filtered results back to Excel-compatible CSV format
  const handleExportCSV = () => {
    // Generate CSV Header
    let csvContent = 'data:text/csv;charset=utf-8,Item Name,Specification,Grade,Material Type,IBR Status,Spreadsheet Occurrences\n';
    
    // Add rows
    filteredItems.forEach(item => {
      const csvRow = [
        `"${item.itemName.replace(/"/g, '""')}"`,
        `"${item.specification.replace(/"/g, '""')}"`,
        `"${item.grade.replace(/"/g, '""')}"`,
        item.material,
        item.isIbr ? 'IBR Certified' : 'Non-IBR',
        item.count
      ].join(',');
      csvContent += csvRow + '\n';
    });

    // Create a temporary anchor element to trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pipes_tubes_filtered_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
              className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-steel-800 hover:bg-steel-700 disabled:opacity-50 text-white shadow-xs hover:shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Download results as a spreadsheet-ready CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
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

      {/* Slide-over selected item details modal */}
      <DetailsModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
