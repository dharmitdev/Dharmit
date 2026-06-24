import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Info, FileSpreadsheet, Anchor, Flame, Shield, HelpCircle } from 'lucide-react';
import { ConsolidateItem } from '../types';

interface DetailsModalProps {
  item: ConsolidateItem | null;
  onClose: () => void;
}

// Map material types to descriptions and properties
const MATERIAL_DATA: Record<string, {
  tagline: string;
  description: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  properties: { label: string; value: string }[];
  applications: string[];
}> = {
  'Stainless Steel': {
    tagline: 'High corrosion resistance & sterile clean-finish standards.',
    description: 'Stainless Steel grades like TP304 and TP316 provide excellent resistance to oxidation, corrosion, and high temperatures, making them critical in sanitary, marine, and highly reactive chemical environments.',
    color: 'emerald',
    bgClass: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    borderClass: 'border-emerald-200/50 dark:border-emerald-900/30',
    textClass: 'text-emerald-800 dark:text-emerald-300',
    properties: [
      { label: 'Corrosion Resistance', value: 'Excellent (Austenitic/Martensitic)' },
      { label: 'Tensile Strength', value: '515 - 600 MPa' },
      { label: 'Sanitary Rating', value: 'Food Grade & Sterile Compliant' },
      { label: 'Typical Nickel %', value: '8.0% - 14.0% (TP304/TP316)' }
    ],
    applications: ['Chemical Processing Plants', 'Food & Dairy Production', 'Pharmaceutical Pipe networks', 'Desalination plants & Marine hydraulics']
  },
  'Carbon Steel': {
    tagline: 'High structural integrity, durability & high thermal conductivity.',
    description: 'Carbon steel (such as ASTM A106 Gr.B or ASME SA179) is the foundation of high-strength operations. It exhibits exceptional thermal conductivity and stress tolerance, perfectly suited for heavy-duty structural and fluid transport operations.',
    color: 'orange',
    bgClass: 'bg-orange-50/70 dark:bg-orange-950/20',
    borderClass: 'border-orange-200/50 dark:border-orange-900/30',
    textClass: 'text-orange-800 dark:text-orange-300',
    properties: [
      { label: 'Weldability', value: 'Superior (Ideal for field welding)' },
      { label: 'Tensile Strength', value: '415 - 485 MPa (Gr.B)' },
      { label: 'Thermal Conductivity', value: 'High (~50 W/m·K)' },
      { label: 'Max Temperature', value: 'Up to 425°C (A106/SA106)' }
    ],
    applications: ['High-Pressure Fluid pipelines', 'Steam & Boiler systems', 'Refinery pipelines', 'Heat exchanger tubes (SA179)']
  },
  'Alloy Steel': {
    tagline: 'Extreme temperature performance & superior creep resistance.',
    description: 'Alloy steel grades (such as T11, T22, P91, T92) are enriched with Chromium and Molybdenum. These alloy elements dramatically elevate creep resistance, hardenability, and structural durability under extreme heat.',
    color: 'purple',
    bgClass: 'bg-purple-50/70 dark:bg-purple-950/20',
    borderClass: 'border-purple-200/50 dark:border-purple-900/30',
    textClass: 'text-purple-800 dark:text-purple-300',
    properties: [
      { label: 'Chromium %', value: '1.25% - 9.00% (elevates oxidation limits)' },
      { label: 'Molybdenum %', value: '0.50% - 1.00% ( creep strength )' },
      { label: 'High Heat Yield', value: 'Creep-rupture strength up to 650°C' },
      { label: 'Hardness (HB)', value: '163 - 250 max' }
    ],
    applications: ['Superheater & Reheater tubes', 'Power Generation Boilers', 'Fossil fuel power piping systems', 'Petrochemical cracking furnaces']
  },
  'Duplex Steel': {
    tagline: 'Balanced austenitic-ferritic structure with high yield strength.',
    description: 'Duplex steel grades (like S31803 or S32205) feature a dual-phase microstructure. This hybrid provides twice the strength of standard austenitic steel, paired with extreme resistance to chloride stress-corrosion cracking.',
    color: 'cyan',
    bgClass: 'bg-cyan-50/70 dark:bg-cyan-950/20',
    borderClass: 'border-cyan-200/50 dark:border-cyan-900/30',
    textClass: 'text-cyan-800 dark:text-cyan-300',
    properties: [
      { label: 'Yield Strength', value: '≥ 450 MPa (Dual Phase)' },
      { label: 'PREN Value', value: '31 - 38 (Pitting Resistance)' },
      { label: 'Stress Cracking', value: 'Highly Immune to Chloride Cracking' },
      { label: 'Microstructure', value: '50% Ferrite, 50% Austenite' }
    ],
    applications: ['Oil & Gas exploration rigs', 'Chemical cargo tanks', 'Pulp & paper bleaching digesters', 'Marine exhaust systems']
  },
  'Super Duplex': {
    tagline: 'Elite defense against pitting, crevice, and acid corrosion.',
    description: 'Super Duplex alloys (such as S32750 or UNS 32507) contain higher levels of Chromium, Nickel, and Molybdenum. Designed for the most hostile offshore and hyper-saline environments on earth.',
    color: 'sky',
    bgClass: 'bg-sky-50/70 dark:bg-sky-950/20',
    borderClass: 'border-sky-200/50 dark:border-sky-900/30',
    textClass: 'text-sky-800 dark:text-sky-300',
    properties: [
      { label: 'Yield Strength', value: '≥ 550 MPa (Extreme)' },
      { label: 'PREN Value', value: '≥ 40 (Super Pitting Defence)' },
      { label: 'Impact Toughness', value: 'Sub-zero temperatures compliant' },
      { label: 'Acid Immunity', value: 'Highly resistant to Sulfuric/Nitric acids' }
    ],
    applications: ['Subsea oil extraction flowlines', 'Offshore scrubbers & flue pipes', 'Reverse osmosis desalination high pressure lines', 'Geothermal energy wells']
  },
  'Titanium': {
    tagline: 'Lightweight aerospace pioneer with unmatched strength-to-weight ratio.',
    description: 'Titanium Grade 2 is highly bio-compatible, extremely light, and exhibits natural surface passivation, making it completely impervious to ambient marine corrosion and human body chemistry.',
    color: 'teal',
    bgClass: 'bg-teal-50/70 dark:bg-teal-950/20',
    borderClass: 'border-teal-200/50 dark:border-teal-900/30',
    textClass: 'text-teal-800 dark:text-teal-300',
    properties: [
      { label: 'Density', value: '4.51 g/cm³ (Extremely Light)' },
      { label: 'Specific Strength', value: 'Highest among all metallic elements' },
      { label: 'Corrosion Rate', value: '0.00 mm/year in marine salts' },
      { label: 'Magnetism', value: 'Non-magnetic' }
    ],
    applications: ['Aircraft hydraulic tubing', 'Medical implants & surgical tools', 'Offshore sea-water cooled condensers', 'Chemical reactors']
  },
  'Mild Steel (MS)': {
    tagline: 'Highly malleable, ductile, and cost-effective commercial plumbing.',
    description: 'Mild Steel seamless pipes (frequently produced under commercial IS 1239 structural limits) offer superb ease of bending, threading, and cold shaping, ideal for low-pressure utilities.',
    color: 'zinc',
    bgClass: 'bg-zinc-50/70 dark:bg-zinc-800/20',
    borderClass: 'border-zinc-200/50 dark:border-zinc-700/30',
    textClass: 'text-zinc-800 dark:text-zinc-300',
    properties: [
      { label: 'Carbon Content', value: 'Low Carbon (< 0.25% C)' },
      { label: 'Malleability', value: 'Excellent cold forming capabilities' },
      { label: 'Surface Finish', value: 'Available in black, painted, or galvanized' },
      { label: 'Hardness', value: '110 - 130 HB' }
    ],
    applications: ['Commercial water plumbing loops', 'Structural frames & scaffolding', 'Low pressure gas distribution', 'Lubricating oil system feeds']
  }
};

const DEFAULT_MATERIAL = {
  tagline: 'High structural integrity and standard industrial specifications.',
  description: 'Standard steel pipes and tubes are tested to stringent specifications to guarantee seamless transport of volatile, hot, or high-pressure fluids with maximum safety and leak prevention.',
  color: 'slate',
  bgClass: 'bg-slate-50/70 dark:bg-slate-800/20',
  borderClass: 'border-slate-200/50 dark:border-slate-700/30',
  textClass: 'text-slate-800 dark:text-slate-300',
  properties: [
    { label: 'Production Process', value: 'Seamless hot-finished or cold-drawn' },
    { label: 'NDT Tested', value: 'Hydrostatic, Eddy Current, or Ultrasonic' },
    { label: 'Standard Rating', value: 'ANSI/ASME B36.10 & B36.19 standard dimensions' },
    { label: 'Dimensional tolerances', value: 'In strict compliance with manufacturing codes' }
  ],
  applications: ['General fluid piping', 'HVAC heat exchangers', 'Structural column support', 'Industrial machinery frameworks']
};

export default function DetailsModal({ item, onClose }: DetailsModalProps) {
  if (!item) return null;

  const matData = MATERIAL_DATA[item.material] || DEFAULT_MATERIAL;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900 backdrop-blur-xs"
        />

        {/* Modal Drawer container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative z-10 w-full max-w-lg md:max-w-xl h-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center space-x-3">
              <span className="p-2 rounded-lg bg-steel-100 dark:bg-slate-900 text-steel-700 dark:text-slate-300">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-50">Technical Specifications</h3>
                <p className="text-xs text-slate-500 font-sans">Identifier: {item.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              id="close-details-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Primary Details Card */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${matData.bgClass} ${matData.textClass} border ${matData.borderClass}`}>
                  {item.material}
                </span>
                {item.isIbr && (
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200/50 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30 rounded-full flex items-center space-x-1">
                    <Flame className="w-3 h-3 text-red-500" />
                    <span>IBR Boiler Compliant</span>
                  </span>
                )}
                {item.count > 1 && (
                  <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30 rounded-full">
                    Consolidated ({item.count} items)
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                {item.itemName}
              </h2>
            </div>

            {/* Spec / Grade Box */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">Standard Code</span>
                <span className="text-lg font-display font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {item.specification || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">Alloy / Grade</span>
                <span className="text-lg font-display font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {item.grade || 'Commercial Grade'}
                </span>
              </div>
            </div>

            {/* Simulated Schematic Diagram */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-900 text-slate-100 relative p-4 flex flex-col items-center justify-center h-48">
              <div className="absolute top-2 left-2 flex items-center space-x-1 font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                <Anchor className="w-3 h-3" />
                <span>Pipe Profile schematic</span>
              </div>

              {/* Dynamic SVG Pipe drawing */}
              <div className="w-full flex justify-center items-center h-full pt-4">
                <svg className="w-4/5 h-20 text-slate-400" viewBox="0 0 300 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer pipe */}
                  <rect x="20" y="20" width="230" height="40" rx="3" fill="url(#metalGrad)" stroke="#475569" strokeWidth="2"/>
                  {/* Pipe inner hole projection */}
                  <ellipse cx="250" cy="40" rx="10" ry="20" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                  {/* Pipe start projection */}
                  <ellipse cx="20" cy="40" rx="6" ry="20" fill="#334155" stroke="#475569" strokeWidth="2" />
                  
                  {/* Dimension lines */}
                  <line x1="20" y1="10" x2="250" y2="10" stroke="#64748b" strokeDasharray="3,3" />
                  <path d="M20 7 L20 13 M250 7 L250 13" stroke="#64748b" />
                  
                  <text x="135" y="8" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">LENGTH (STD 6.0m / 12.0m)</text>
                  <text x="280" y="43" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">OD</text>
                  <line x1="270" y1="20" x2="270" y2="60" stroke="#64748b" />
                  <path d="M267 20 L273 20 M267 60 L273 60" stroke="#64748b" />

                  {/* Metal gradient */}
                  <defs>
                    <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#334155" />
                      <stop offset="35%" stopColor="#64748b" />
                      <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.8" />
                      <stop offset="65%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#334155" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="absolute bottom-2 right-2 flex space-x-4 font-mono text-[9px] text-slate-400">
                <span>SEAMLESS WALL</span>
                <span>SCH 40/80/XS READY</span>
              </div>
            </div>

            {/* Overview / Tagline */}
            <div className="space-y-2">
              <h4 className="font-display font-semibold text-slate-800 dark:text-slate-200">Material Overview</h4>
              <p className="text-sm font-semibold italic text-slate-500 font-sans">"{matData.tagline}"</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {matData.description}
              </p>
            </div>

            {/* Properties table */}
            <div className="space-y-2">
              <h4 className="font-display font-semibold text-slate-800 dark:text-slate-200">Typical Technical Properties</h4>
              <div className="border border-slate-100 dark:border-slate-900 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-900 font-sans">
                {matData.properties.map((prop, i) => (
                  <div key={i} className="flex justify-between p-2.5 text-xs">
                    <span className="text-slate-400 font-medium">{prop.label}</span>
                    <span className="text-slate-800 dark:text-slate-300 font-semibold text-right">{prop.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Applications List */}
            <div className="space-y-2">
              <h4 className="font-display font-semibold text-slate-800 dark:text-slate-200">Primary Applications</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans">
                {matData.applications.map((app, i) => (
                  <li key={i} className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="p-0.5 rounded bg-emerald-500/10 text-emerald-600 mt-0.5 shrink-0">
                      ✓
                    </span>
                    <span>{app}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* IBR Detail Banner */}
            {item.isIbr && (
              <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/40 dark:border-rose-900/30 rounded-xl p-4 flex items-start space-x-3 font-sans">
                <Flame className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-rose-900 dark:text-rose-300 uppercase tracking-wider">Indian Boiler Regulations (IBR) Certified</h5>
                  <p className="text-xs text-rose-700/80 dark:text-rose-400/80 leading-relaxed">
                    This grade and code is 100% compliant with IBR high-pressure guidelines. Certified for use in boiler feed, superheater steam distribution, and power station utility circuits where extreme pressure stress is continuous.
                  </p>
                </div>
              </div>
            )}

            {/* Deduplication & Source Sheet Info */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-2.5 font-sans">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                <Info className="w-4 h-4 text-steel-500" />
                <h5 className="text-xs font-semibold uppercase tracking-wider">Spreadsheet Diagnostics</h5>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The original Excel sheet contained <strong className="text-slate-800 dark:text-slate-200">{item.count} duplicate records</strong> with this exact name, specification standard, and grade alloy. The search engine automatically consolidates these to keep your catalog clean and easy to browse.
              </p>
              
              {/* Duplicate occurrence visualization bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-mono">
                  <span>Occurrences</span>
                  <span>{item.count} Record{item.count > 1 ? 's' : ''}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-steel-500 transition-all" 
                    style={{ width: `${Math.min(100, (item.count / 20) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-900 flex justify-end space-x-2 bg-slate-50/50 dark:bg-slate-900/20">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs hover:shadow-sm transition-all"
            >
              Back to Catalog
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
