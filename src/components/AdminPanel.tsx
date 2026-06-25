import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Database,
  BarChart3,
  Layers,
  History,
  Info
} from 'lucide-react';
import { ConsolidateItem, ActivityLog } from '../types';

interface AdminPanelProps {
  dataset: ConsolidateItem[];
  onUpdateDataset: (newDataset: ConsolidateItem[]) => void;
  activityLogs: ActivityLog[];
  onAddActivityLog: (action: 'add' | 'edit' | 'delete' | 'reset', item: Partial<ConsolidateItem>) => void;
  onClose: () => void;
}

const MATERIAL_OPTIONS = [
  'Carbon Steel',
  'Stainless Steel',
  'Alloy Steel',
  'Duplex Steel',
  'Super Duplex',
  'Mild Steel (MS)',
  'Titanium',
  'Other'
];

const SHAPE_OPTIONS = [
  'Carbon Steel Seamless Pipes',
  'Carbon Steel Seamless Tubes',
  'Carbon Steel Seamless U Tubes',
  'Carbon Steel Seamless Finned Tubes',
  'Carbon Steel Seamless Riffle Tubes',
  'Carbon Steel Seamless Special Bends Tubes',
  'Stainless Steel Seamless Pipe',
  'Stainless Steel Seamless Tubes',
  'Stainless Steel Seamless U Tubes',
  'Alloy Steel Seamless Pipes',
  'Alloy Steel Seamless Tubes',
  'Alloy Steel Seamless U Tubes',
  'Alloy Steel Seamless Special Bends Tubes',
  'Duplex Seamless Tubes',
  'Duplex Steel Seamless Tubes',
  'Duplex Steel Seamless U Tubes',
  'Super Duplex Seamless Tubes',
  'Super Duplex Seamless U-Tube',
  'MS Seamless Pipes',
  'Titanium Tubes Grade 2',
  'As Pierced Hollows',
  'Other / Custom'
];

export default function AdminPanel({
  dataset,
  onUpdateDataset,
  activityLogs,
  onAddActivityLog,
  onClose
}: AdminPanelProps) {
  // Search & filter
  const [adminQuery, setAdminQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('All');
  const [selectedShape, setSelectedShape] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add/Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsolidateItem | null>(null);

  // Form fields
  const [formItemName, setFormItemName] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [formSpecification, setFormSpecification] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formMaterial, setFormMaterial] = useState('Carbon Steel');
  const [customMaterial, setCustomMaterial] = useState('');
  const [formCount, setFormCount] = useState(1);
  const [formIsIbr, setFormIsIbr] = useState(false);

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<ConsolidateItem | null>(null);
  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Status banners
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-fill material based on shape input
  const handleShapeChange = (shape: string) => {
    setFormItemName(shape);
    const shapeLower = shape.toLowerCase();
    if (shapeLower.includes('super duplex')) {
      setFormMaterial('Super Duplex');
    } else if (shapeLower.includes('duplex')) {
      setFormMaterial('Duplex Steel');
    } else if (shapeLower.includes('stainless')) {
      setFormMaterial('Stainless Steel');
    } else if (shapeLower.includes('alloy steel') || shapeLower.includes('aly')) {
      setFormMaterial('Alloy Steel');
    } else if (shapeLower.includes('titanium')) {
      setFormMaterial('Titanium');
    } else if (shapeLower.includes('ms') || shapeLower.includes('mild steel')) {
      setFormMaterial('Mild Steel (MS)');
    } else if (shapeLower.includes('carbon') || shapeLower.includes('riffle') || shapeLower.includes('finned')) {
      setFormMaterial('Carbon Steel');
    }
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormItemName(SHAPE_OPTIONS[0]);
    setCustomItemName('');
    setFormSpecification('');
    setFormGrade('');
    setFormMaterial('Carbon Steel');
    setCustomMaterial('');
    setFormCount(1);
    setFormIsIbr(false);
    setIsFormOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item: ConsolidateItem) => {
    setEditingItem(item);
    
    const isStandardShape = SHAPE_OPTIONS.includes(item.itemName);
    setFormItemName(isStandardShape ? item.itemName : 'Other / Custom');
    setCustomItemName(isStandardShape ? '' : item.itemName);
    
    setFormSpecification(item.specification);
    setFormGrade(item.grade);
    
    const isStandardMaterial = MATERIAL_OPTIONS.includes(item.material);
    setFormMaterial(isStandardMaterial ? item.material : 'Other');
    setCustomMaterial(isStandardMaterial ? '' : item.material);
    
    setFormCount(item.count);
    setFormIsIbr(item.isIbr);
    setIsFormOpen(true);
  };

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalItemName = formItemName === 'Other / Custom' ? customItemName.trim() : formItemName;
    const finalMaterial = formMaterial === 'Other' ? customMaterial.trim() : formMaterial;

    if (!finalItemName) {
      alert('Please specify a valid item name or shape.');
      return;
    }
    if (!finalMaterial) {
      alert('Please specify a valid material type.');
      return;
    }

    if (editingItem) {
      // EDIT existing item
      const updatedDataset = dataset.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            itemName: finalItemName,
            specification: formSpecification.trim(),
            grade: formGrade.trim(),
            material: finalMaterial,
            count: Number(formCount),
            isIbr: formIsIbr
          };
        }
        return item;
      });

      onUpdateDataset(updatedDataset);
      onAddActivityLog('edit', {
        itemName: finalItemName,
        specification: formSpecification.trim(),
        grade: formGrade.trim(),
        count: Number(formCount)
      });
      showStatus(`Successfully updated database entry: ${formSpecification} ${formGrade}`);
    } else {
      // ADD new item
      const newItem: ConsolidateItem = {
        id: `pipe-custom-${Date.now()}`,
        itemName: finalItemName,
        specification: formSpecification.trim(),
        grade: formGrade.trim(),
        material: finalMaterial,
        count: Number(formCount),
        isIbr: formIsIbr
      };

      onUpdateDataset([newItem, ...dataset]);
      onAddActivityLog('add', newItem);
      showStatus(`Successfully added new database entry: ${formSpecification} ${formGrade}`);
    }

    setIsFormOpen(false);
  };

  // Delete handler
  const confirmDelete = (item: ConsolidateItem) => {
    setItemToDelete(item);
  };

  const executeDelete = () => {
    if (!itemToDelete) return;

    const updatedDataset = dataset.filter(item => item.id !== itemToDelete.id);
    onUpdateDataset(updatedDataset);
    onAddActivityLog('delete', itemToDelete);
    setItemToDelete(null);
    showStatus(`Successfully deleted entry: ${itemToDelete.specification} ${itemToDelete.grade}`);
  };

  // JSON Import & Export
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `materials_desk_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showStatus("Exported complete database backup successfully.");
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onUpdateDataset(parsed);
          onAddActivityLog('reset', { itemName: 'Imported Backup File' });
          showStatus(`Imported ${parsed.length} records successfully.`);
        } else {
          alert("Invalid file format. Backup file must contain a JSON array of items.");
        }
      } catch (err) {
        alert("Error parsing JSON backup file. Please make sure it is a valid backup.");
      }
    };
    fileReader.readAsText(file);
  };

  // Display status banner helper
  const showStatus = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  // Filter dynamic dataset for table list
  const filteredDataset = useMemo(() => {
    return dataset.filter(item => {
      // Filter by search query
      const matchesSearch = adminQuery.trim() === '' || 
        `${item.itemName} ${item.specification} ${item.grade} ${item.material}`.toLowerCase()
        .includes(adminQuery.toLowerCase());

      // Filter by Material
      const matchesMaterial = selectedMaterial === 'All' || item.material === selectedMaterial;

      // Filter by Shape
      const matchesShape = selectedShape === 'All' || item.itemName === selectedShape;

      return matchesSearch && matchesMaterial && matchesShape;
    });
  }, [dataset, adminQuery, selectedMaterial, selectedShape]);

  // Paginated items
  const paginatedDataset = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDataset.slice(start, start + itemsPerPage);
  }, [filteredDataset, currentPage]);

  const totalPages = Math.ceil(filteredDataset.length / itemsPerPage) || 1;

  // Chart computation - Material categories breakdown
  const materialChartData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    dataset.forEach(item => {
      counts[item.material] = (counts[item.material] || 0) + item.count;
    });
    
    const totalCount = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalCount) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [dataset]);

  return (
    <div className="space-y-6" id="admin-panel-root">
      
      {/* Banner / Success notification */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-xl flex items-center space-x-3 text-xs border border-slate-800"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Admin Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-slate-950 dark:bg-slate-800 text-amber-500 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-slate-50">
              Admin Control Centre
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-xl">
            Welcome back to the inventory, Dharmit. Below you can add standard specifications, edit grades, adjust inventory counts, perform secure data backups, and view modification logs.
          </p>
          <div className="pt-1.5 flex flex-wrap gap-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800/60 shadow-3xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Auto-Logout Active: 30m session limit
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800/60 shadow-3xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Inactivity Guard: 5m AFK logout
            </span>
          </div>
        </div>
        
        {/* Navigation & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all active:scale-[0.98]"
            id="admin-add-button"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Entry</span>
          </button>
          
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
            title="Download full database as JSON backup"
            id="admin-export-button"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Backup DB</span>
          </button>

          <label className="px-3 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Restore DB</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              className="hidden" 
              id="admin-import-file"
            />
          </label>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-100 dark:border-rose-950/30 flex items-center space-x-1.5 cursor-pointer transition-colors"
            title="Reset database back to the default factory entries"
            id="admin-reset-button"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset DB</span>
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors border border-transparent"
            id="admin-view-public-button"
          >
            Exit Console
          </button>
        </div>
      </div>

      {/* Admin Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Database Table List (Span 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
            
            {/* Table Filters Header */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Fuzzy search standards, grades or items..."
                  value={adminQuery}
                  onChange={(e) => { setAdminQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9.5 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 dark:focus:ring-slate-400 transition-all placeholder:text-slate-400/70"
                  id="admin-table-search"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Material dropdown filter */}
                <div className="relative">
                  <select
                    value={selectedMaterial}
                    onChange={(e) => { setSelectedMaterial(e.target.value); setCurrentPage(1); }}
                    className="appearance-none pl-3.5 pr-8 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1.5 focus:ring-slate-500 cursor-pointer"
                    id="admin-material-select"
                  >
                    <option value="All">All Materials</option>
                    {MATERIAL_OPTIONS.filter(o => o !== 'Other').map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Shape dropdown filter */}
                <div className="relative max-w-[150px] sm:max-w-none">
                  <select
                    value={selectedShape}
                    onChange={(e) => { setSelectedShape(e.target.value); setCurrentPage(1); }}
                    className="appearance-none pl-3.5 pr-8 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1.5 focus:ring-slate-500 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                    id="admin-shape-select"
                  >
                    <option value="All">All Shapes</option>
                    {SHAPE_OPTIONS.filter(o => o !== 'Other / Custom').map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table Display */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-950/30 border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                    <th className="py-3 px-4">Standard Code</th>
                    <th className="py-3 px-4">Grade Alloy</th>
                    <th className="py-3 px-4">Item Type / Shape</th>
                    <th className="py-3 px-4">Material</th>
                    <th className="py-3 px-4 text-center">Qty / Count</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedDataset.length > 0 ? (
                    paginatedDataset.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/55 dark:hover:bg-slate-900/30 transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.specification || (
                            <span className="text-slate-400 italic">No Spec</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-750 dark:text-slate-200">
                            {item.grade || '---'}
                          </span>
                          {item.isIbr && (
                            <span className="ml-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-sans">
                              IBR
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-350 max-w-[180px] truncate" title={item.itemName}>
                          {item.itemName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-500 dark:text-slate-400">
                            {item.material}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold font-mono">
                          {item.count}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                              title="Edit item details"
                              id={`admin-edit-${item.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(item)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                              title="Delete item"
                              id={`admin-delete-${item.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-600">
                        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-sans text-xs">No entries match the active admin filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>
                  Showing <strong className="text-slate-700 dark:text-slate-350">{Math.min(filteredDataset.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredDataset.length, currentPage * itemsPerPage)}</strong> of <strong className="text-slate-700 dark:text-slate-350">{filteredDataset.length}</strong> items
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                    id="admin-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                    id="admin-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Metrics & Activity Log (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Visual Distribution Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <BarChart3 className="w-4.5 h-4.5 text-steel-500" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Material Share (By Qty)
              </h3>
            </div>

            <div className="space-y-3 font-sans text-xs">
              {materialChartData.slice(0, 5).map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="font-medium text-slate-800 dark:text-slate-250">{item.name}</span>
                    <span className="font-mono">{item.count} pcs ({item.percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-950 dark:bg-slate-200 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Audit Log Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-4.5 h-4.5 text-steel-500" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Recent Modifications
                </h3>
              </div>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {activityLogs.length} logs
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex gap-3 text-xs border-b border-slate-50 dark:border-slate-800/45 pb-2.5 last:border-0 last:pb-0 font-sans"
                  >
                    <div className="mt-0.5 shrink-0">
                      {log.action === 'add' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Added" />
                      )}
                      {log.action === 'edit' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Updated" />
                      )}
                      {log.action === 'delete' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" title="Deleted" />
                      )}
                      {log.action === 'reset' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" title="Reset/Import" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-0.5">
                      <p className="text-slate-700 dark:text-slate-350 leading-relaxed text-[11px]">
                        <strong>Dharmit</strong> {log.action === 'add' && 'added new specification'}
                        {log.action === 'edit' && 'modified entry details'}
                        {log.action === 'delete' && 'deleted entry'}
                        {log.action === 'reset' && 'synchronized database records'}: <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">{log.specification} {log.grade}</span> ({log.itemName})
                      </p>
                      
                      <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400 dark:text-slate-600 text-xs">
                  <p>No activity recorded in this session yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Add / Edit Specification Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs"
            />

            {/* Dialog Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 z-10"
              id="admin-form-modal"
            >
              {/* Form Element */}
              <form onSubmit={handleFormSubmit}>
                
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                  <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-base">
                    {editingItem ? 'Edit Specification Entry' : 'Add New Pipe & Tube Spec'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  
                  {/* Shape selection field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                      Item Shape / Type Group
                    </label>
                    <div className="relative">
                      <select
                        value={formItemName}
                        onChange={(e) => handleShapeChange(e.target.value)}
                        className="appearance-none w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 cursor-pointer"
                        id="form-item-name-select"
                      >
                        {SHAPE_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Custom Shape input if selected */}
                  {formItemName === 'Other / Custom' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-1.5"
                    >
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                        Specify Custom Item/Shape Name
                      </label>
                      <input
                        type="text"
                        required
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="e.g., Nickel Alloy Welded Tubes"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 transition-all"
                        id="form-custom-item-input"
                      />
                    </motion.div>
                  )}

                  {/* Material type selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                      Material Classification
                    </label>
                    <div className="relative">
                      <select
                        value={formMaterial}
                        onChange={(e) => setFormMaterial(e.target.value)}
                        className="appearance-none w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 cursor-pointer"
                        id="form-material-select"
                      >
                        {MATERIAL_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Custom Material input if selected */}
                  {formMaterial === 'Other' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-1.5"
                    >
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                        Specify Custom Material Type
                      </label>
                      <input
                        type="text"
                        required
                        value={customMaterial}
                        onChange={(e) => setCustomMaterial(e.target.value)}
                        placeholder="e.g., Inconel 600"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-sans text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 transition-all"
                        id="form-custom-material-input"
                      />
                    </motion.div>
                  )}

                  {/* Split row for standard spec and alloy grade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Specification */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                        Specification Standard (Spec)
                      </label>
                      <input
                        type="text"
                        required
                        value={formSpecification}
                        onChange={(e) => setFormSpecification(e.target.value)}
                        placeholder="e.g., ASME SA213, DIN 1629"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 transition-all"
                        id="form-spec-input"
                      />
                    </div>

                    {/* Grade */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                        Grade Alloy (Grade)
                      </label>
                      <input
                        type="text"
                        value={formGrade}
                        onChange={(e) => setFormGrade(e.target.value)}
                        placeholder="e.g., TP304, St 37.0"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 transition-all"
                        id="form-grade-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                    {/* Count */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">
                        Original Occurrence Count
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        required
                        value={formCount}
                        onChange={(e) => setFormCount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-slate-500 transition-all"
                        id="form-count-input"
                      />
                    </div>

                    {/* IBR certified checkbox */}
                    <div className="flex items-center h-full pt-4">
                      <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-350 select-none">
                        <input
                          type="checkbox"
                          checked={formIsIbr}
                          onChange={(e) => setFormIsIbr(e.target.checked)}
                          className="w-4.5 h-4.5 text-slate-900 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 rounded-md focus:ring-0 cursor-pointer"
                          id="form-ibr-checkbox"
                        />
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            IBR Certified Code
                          </span>
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            Qualifies under Indian Boiler Regulations safety laws
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold rounded-xl hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md transition-all"
                    id="form-submit-button"
                  >
                    {editingItem ? 'Save Updates' : 'Add to Database'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Alert Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
              id="admin-delete-confirm"
            >
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="space-y-1.5 font-sans">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Confirm Spec Deletion?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you absolutely sure you want to delete the entry <strong className="font-mono text-slate-750 dark:text-slate-250">{itemToDelete.specification} {itemToDelete.grade}</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-850 hover:bg-slate-50 text-slate-700 dark:text-slate-250 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm active:scale-[0.98]"
                  id="admin-delete-execute"
                >
                  Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Alert Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
              id="admin-reset-confirm"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="space-y-1.5 font-sans">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Reset Database to Default?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will wipe all modifications, custom additions, or deletions and restore the catalog back to the original standard factory spreadsheet entries.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-850 hover:bg-slate-50 text-slate-700 dark:text-slate-250 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('materials_desk_dataset');
                    window.location.reload();
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg cursor-pointer shadow-sm active:scale-[0.98]"
                  id="admin-reset-execute"
                >
                  Reset Factory Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
