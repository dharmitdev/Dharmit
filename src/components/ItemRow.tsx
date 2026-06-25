import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Layers, ArrowUpRight, Copy, Check } from 'lucide-react';
import { ConsolidateItem } from '../types';

interface ItemRowProps {
  key?: string;
  item: ConsolidateItem;
  searchQuery: string;
  onSelect: (item: ConsolidateItem) => void;
  isConsolidated: boolean;
}

// Highlight substring matches in target text
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <span className="font-sans">{text}</span>;
  
  const tokens = highlight.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return <span className="font-sans">{text}</span>;

  // Create regex pattern matching any of the tokens
  // Escaping special characters
  const escapedTokens = tokens.map(token => token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  
  const parts = text.split(regex);
  
  return (
    <span className="font-sans">
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 px-0.5 rounded-xs font-semibold font-sans">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export default function ItemRow({ item, searchQuery, onSelect, isConsolidated }: ItemRowProps) {
  const [copied, setCopied] = useState(false);

  // Determine material color styling
  const getMaterialColorClass = (material: string) => {
    switch (material) {
      case 'Stainless Steel':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900/30';
      case 'Carbon Steel':
        return 'text-orange-700 bg-orange-50 border-orange-100 dark:text-orange-300 dark:bg-orange-950/20 dark:border-orange-900/30';
      case 'Alloy Steel':
        return 'text-purple-700 bg-purple-50 border-purple-100 dark:text-purple-300 dark:bg-purple-950/20 dark:border-purple-900/30';
      case 'Duplex Steel':
        return 'text-cyan-700 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/20 dark:border-cyan-900/30';
      case 'Super Duplex':
        return 'text-sky-700 bg-sky-50 border-sky-100 dark:text-sky-300 dark:bg-sky-950/20 dark:border-sky-900/30';
      case 'Titanium':
        return 'text-teal-700 bg-teal-50 border-teal-100 dark:text-teal-300 dark:bg-teal-950/20 dark:border-teal-900/30';
      case 'Mild Steel (MS)':
        return 'text-zinc-700 bg-zinc-50 border-zinc-100 dark:text-zinc-300 dark:bg-zinc-800/20 dark:border-zinc-700/30';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-100 dark:text-slate-300 dark:bg-slate-800/20 dark:border-slate-700/30';
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal when clicking copy
    navigator.clipboard.writeText(item.itemName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect(item)}
      className="group relative bg-white dark:bg-slate-900/80 hover:bg-slate-50/50 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 md:p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      {/* Visual background indicator for material hover */}
      <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-xl bg-slate-300 dark:bg-slate-700 group-hover:bg-steel-500 transition-colors" />

      {/* Main content group */}
      <div className="space-y-2 md:space-y-1.5 md:max-w-2xl flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Material Badge */}
          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-md border ${getMaterialColorClass(item.material)}`}>
            {item.material}
          </span>
          
          {/* IBR certification indicator */}
          {item.isIbr && (
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30 rounded-md flex items-center space-x-0.5">
              <Flame className="w-3 h-3 text-rose-500 shrink-0" />
              <span>IBR certified</span>
            </span>
          )}

          {/* Consolidate occurrences count indicator */}
          {isConsolidated && item.count > 1 && (
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex items-center space-x-1">
              <Layers className="w-3 h-3 text-slate-500" />
              <span>{item.count} copies</span>
            </span>
          )}
        </div>

        {/* Primary Highlighted Item Name (Big and Bold as requested) */}
        <h3 className="text-lg font-display font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
          {item.itemName}
        </h3>

        {/* Item standard specification / code and Grade for easy cross-verification */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-700/50">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold mr-1">Specification:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              <HighlightText text={item.specification || 'Commercial Code'} highlight={searchQuery} />
            </span>
          </div>
          {item.grade && (
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-700/50">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold mr-1">Grade:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                <HighlightText text={item.grade} highlight={searchQuery} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Copy / Details Action side badge */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2.5 md:pt-0 border-t border-slate-100 dark:border-slate-800 md:border-t-0">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Deduplicated count */}
          {isConsolidated && item.count > 1 && (
            <div className="hidden md:flex flex-col items-end pr-2 text-right">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ×{item.count} Entries
              </span>
              <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">
                Consolidated
              </span>
            </div>
          )}

          {/* Quick Copy Item Name button */}
          <button
            onClick={handleCopy}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs border ${
              copied
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600'
                : 'bg-steel-50 hover:bg-steel-100 text-steel-800 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-700'
            }`}
            title="Copy exact Item Name to clipboard for ERP"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Copied to ERP!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-steel-600" />
                <span className="whitespace-nowrap">Copy Item Name</span>
              </>
            )}
          </button>

          {/* Info Details Indicator */}
          <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-steel-50 dark:bg-slate-950 dark:group-hover:bg-slate-800 text-slate-400 group-hover:text-steel-600 transition-all border border-slate-100 dark:border-slate-800" title="View technical specifications sheet">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
