import { useState, useMemo, useEffect } from 'react';
import { PIPE_DIMENSIONS, PipeDimensionRecord } from '../lib/pipeDimensions';
import { HelpCircle, ChevronRight, Hash, Ruler, Sparkles } from 'lucide-react';
import { logVisitorAction, subscribeToNpsDimensions } from '../lib/firebase';

function parseNpsToDecimal(input: string): number | null {
  let clean = input.trim().replace(/^["']|["']$/g, '').replace(/\"$/, '').trim();
  if (!clean) return null;

  // Case 1: Simple decimal number or integer (e.g. "0.5", "2", "2.5")
  if (/^\d+(\.\d+)?$/.test(clean)) {
    return parseFloat(clean);
  }

  // Case 2: Fraction (e.g. "1/2", "3/8")
  if (/^\d+\/\d+$/.test(clean)) {
    const parts = clean.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    return den !== 0 ? num / den : null;
  }

  // Case 3: Mixed fraction (e.g. "1 1/2", "2 1/2", "1-1/2")
  const mixedMatch = clean.match(/^(\d+)[\s-](.+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const fractionPart = mixedMatch[2].trim();
    if (/^\d+\/\d+$/.test(fractionPart)) {
      const parts = fractionPart.split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      return den !== 0 ? whole + (num / den) : null;
    }
  }

  return null;
}

export default function PipeDimensionCalculator() {
  const [npsInput, setNpsInput] = useState('2');
  const [schInput, setSchInput] = useState('STD');
  const [dimensions, setDimensions] = useState<PipeDimensionRecord[]>(PIPE_DIMENSIONS);

  useEffect(() => {
    const unsubscribe = subscribeToNpsDimensions((data) => {
      if (data && data.length > 0) {
        setDimensions(data);
      }
    });
    return () => unsubscribe();
  }, []);

  // Generate lists of available NPS and schedules for suggestions
  const allNpsList = useMemo(() => {
    return dimensions.map(item => item.nps);
  }, [dimensions]);

  const allSchedulesList = useMemo(() => {
    const set = new Set<string>();
    dimensions.forEach(item => {
      Object.keys(item.schedules).forEach(sch => set.add(sch));
    });
    return Array.from(set).sort((a, b) => {
      // Sort numbers first, then words
      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (isNaN(aNum) && isNaN(bNum)) return a.localeCompare(b);
      if (isNaN(aNum)) return 1;
      if (isNaN(bNum)) return -1;
      return aNum - bNum;
    });
  }, [dimensions]);

  // Normalize inputs to find matches
  const matchResult = useMemo(() => {
    // 1. Normalize NPS input
    let cleanNps = npsInput.trim();
    // Remove trailing/leading quotes if user typed e.g. 2"
    cleanNps = cleanNps.replace(/^["']|["']$/g, '').replace(/\"$/, '').trim();
    
    // Attempt exact match first
    let record = dimensions.find(
      r => r.nps.toLowerCase() === cleanNps.toLowerCase()
    );

    // If not found, try robust decimal equivalence (e.g. "0.5" -> "1/2", "1.25" -> "1 1/4")
    if (!record) {
      const inputDecimal = parseNpsToDecimal(cleanNps);
      if (inputDecimal !== null) {
        record = dimensions.find(r => {
          const rDecimal = parseNpsToDecimal(r.nps);
          return rDecimal !== null && Math.abs(rDecimal - inputDecimal) < 0.001;
        });
      }
    }

    // 2. Normalize Schedule input
    let cleanSch = schInput.trim().toUpperCase();
    // Remove "SCH", "SCH." if present (e.g. "SCH 40" -> "40")
    cleanSch = cleanSch.replace(/^SCH[\s\.]*/i, '').trim();

    let thickness: number | null = null;
    let scheduleMatched = false;
    let availableSchedules: string[] = [];

    if (record) {
      availableSchedules = Object.keys(record.schedules);
      // Try exact match in record schedules
      if (record.schedules[cleanSch]) {
        thickness = record.schedules[cleanSch];
        scheduleMatched = true;
      } else {
        // Try case-insensitive keys match
        const matchedKey = Object.keys(record.schedules).find(
          k => k.toUpperCase() === cleanSch
        );
        if (matchedKey) {
          thickness = record.schedules[matchedKey];
          scheduleMatched = true;
        }
      }
    }

    return {
      record,
      thickness,
      scheduleMatched,
      availableSchedules,
      normalizedNps: record ? record.nps : null,
      normalizedSch: cleanSch
    };
  }, [npsInput, schInput, dimensions]);

  const { record, thickness, scheduleMatched, availableSchedules } = matchResult;

  // Calculate auxiliary measurements
  const od = record ? record.od : null;
  const dn = record ? record.dn : null;
  const id = od !== null && thickness !== null ? Math.max(0, parseFloat((od - 2 * thickness).toFixed(2))) : null;

  // Calculated Carbon Steel Pipe Weight (kg/m)
  // W = 0.0246615 * (OD - t) * t
  const pipeWeight = useMemo(() => {
    if (od === null || thickness === null) return null;
    const w = 0.0246615 * (od - thickness) * thickness;
    return parseFloat(w.toFixed(2));
  }, [od, thickness]);

  // Handle auto-logging of searches when a valid match is made
  const [lastLoggedKey, setLastLoggedKey] = useState('');
  useMemo(() => {
    if (record && thickness) {
      const key = `${record.nps}-${schInput}`;
      if (key !== lastLoggedKey) {
        logVisitorAction(`Used NPS converter for NPS ${record.nps} SCH ${schInput} (OD: ${record.od}mm, t: ${thickness}mm)`, 'filter');
        setLastLoggedKey(key);
      }
    }
  }, [record, thickness, schInput, lastLoggedKey]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden" id="nps-calculator-section">
      <div className="bg-slate-900 dark:bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-amber-500/10 text-amber-500 rounded-lg">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-display font-extrabold text-white tracking-tight">
              Interactive Pipe Dimension Converter
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              ANSI B36.10 & B36.19 Steel Pipe Dimensions Chart lookup
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
          ANSI B36.10
        </span>
      </div>

      <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Inputs and Values */}
        <div className="lg:col-span-7 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* NPS Input Box */}
            <div className="space-y-1.5">
              <label htmlFor="nps-input-field" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Nominal Pipe Size (NPS)
              </label>
              <div className="relative">
                <input
                  id="nps-input-field"
                  type="text"
                  value={npsInput}
                  onChange={(e) => setNpsInput(e.target.value)}
                  placeholder="e.g. 2, 1/2, 10"
                  className="w-full pl-3 pr-18 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-steel-500/20 focus:border-steel-500 transition-all text-slate-900 dark:text-slate-50"
                  list="nps-suggestions"
                />
                <datalist id="nps-suggestions">
                  {allNpsList.map(nps => (
                    <option key={`sug-nps-${nps}`} value={nps} />
                  ))}
                </datalist>
                <div className="absolute right-7 top-2.5 text-[10px] font-mono text-slate-400 pointer-events-none">
                  inches
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Type standard (e.g. 1/8 to 48) or select from suggestions
              </p>
            </div>

            {/* Schedule Input Box */}
            <div className="space-y-1.5">
              <label htmlFor="sch-input-field" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Schedule (SCH)
              </label>
              <div className="relative">
                <input
                  id="sch-input-field"
                  type="text"
                  value={schInput}
                  onChange={(e) => setSchInput(e.target.value)}
                  placeholder="e.g. STD, 40, XS, 80"
                  className="w-full pl-3 pr-18 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-steel-500/20 focus:border-steel-500 transition-all text-slate-900 dark:text-slate-50"
                  list="sch-suggestions"
                />
                <datalist id="sch-suggestions">
                  {allSchedulesList.map(sch => (
                    <option key={`sug-sch-${sch}`} value={sch} />
                  ))}
                </datalist>
                <div className="absolute right-7 top-2.5 text-[10px] font-mono text-slate-400 pointer-events-none">
                  SCH
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-sans">
                Examples: STD, XS, XXS, 10, 40, 80, 160
              </p>
            </div>
          </div>

          {/* Quick-select chips for popular NPS / Schedule tests */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mr-1">
              Quick Presets:
            </span>
            <button
              onClick={() => { setNpsInput('2'); setSchInput('STD'); }}
              className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/50 dark:border-slate-750 transition-colors cursor-pointer font-mono"
            >
              NPS 2 STD
            </button>
            <button
              onClick={() => { setNpsInput('1/2'); setSchInput('80'); }}
              className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/50 dark:border-slate-750 transition-colors cursor-pointer font-mono"
            >
              NPS 1/2 SCH 80
            </button>
            <button
              onClick={() => { setNpsInput('4'); setSchInput('40'); }}
              className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/50 dark:border-slate-750 transition-colors cursor-pointer font-mono"
            >
              NPS 4 SCH 40
            </button>
            <button
              onClick={() => { setNpsInput('8'); setSchInput('XS'); }}
              className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-md border border-slate-200/50 dark:border-slate-750 transition-colors cursor-pointer font-mono"
            >
              NPS 8 XS
            </button>
          </div>

          {/* Core Measurement Output Panels */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {/* Outside Diameter */}
            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-850 p-3 rounded-xl text-center">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block">Outside Diameter (OD)</span>
              <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-50 block mt-1">
                {od !== null ? `${od} mm` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {record ? `NPS ${record.nps} spec` : 'Unknown NPS'}
              </span>
            </div>

            {/* Wall Thickness */}
            <div className={`p-3 rounded-xl text-center border transition-all ${
              thickness !== null 
                ? 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/20' 
                : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-850'
            }`}>
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block">Wall Thickness (t)</span>
              <span className="text-xl font-mono font-bold text-amber-600 dark:text-amber-400 block mt-1">
                {thickness !== null ? `${thickness} mm` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {scheduleMatched ? `SCH ${schInput.toUpperCase()}` : 'No schedule match'}
              </span>
            </div>

            {/* Inside Diameter */}
            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-850 p-3 rounded-xl text-center">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block">Inside Diameter (ID)</span>
              <span className="text-xl font-mono font-bold text-slate-900 dark:text-slate-50 block mt-1">
                {id !== null ? `${id} mm` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {id !== null ? 'OD - 2 × thickness' : 'Needs matching SCH'}
              </span>
            </div>

            {/* Weight calculation or DN */}
            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-850 p-3 rounded-xl text-center">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block">Est. Pipe Weight</span>
              <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                {pipeWeight !== null ? `${pipeWeight} kg/m` : '—'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {pipeWeight !== null ? 'ANSI Carbon Steel' : 'Needs valid parameters'}
              </span>
            </div>
          </div>

          {/* Validation Messages & Help boxes */}
          {!record ? (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start space-x-2 text-xs text-rose-700 dark:text-rose-400 animate-in fade-in">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">NPS "{npsInput}" is not recognized.</p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Please check the nominal pipe size chart. Valid NPS includes: 1/8, 1/4, 3/8, 1/2, 3/4, 1, 1 1/4, 1 1/2, 2, 2 1/2, 3, 3 1/2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, etc.
                </p>
              </div>
            </div>
          ) : !scheduleMatched ? (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Schedule "{schInput}" is not defined for NPS {record.nps}.</p>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    While we found the Outside Diameter of <strong className="text-slate-800 dark:text-slate-200 font-mono">{record.od} mm</strong> (DN {record.dn}) for NPS {record.nps}, this size does not define schedule {schInput} in standard tables.
                  </p>
                </div>
              </div>
              
              {availableSchedules.length > 0 && (
                <div className="pl-6 pt-1">
                  <span className="text-[10px] font-semibold text-amber-800/80 dark:text-amber-400/80 block uppercase tracking-wider mb-1.5">
                    Available schedules for NPS {record.nps}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSchedules.map(sch => (
                      <button
                        key={`avail-sch-${sch}`}
                        onClick={() => setSchInput(sch)}
                        className="px-2 py-0.5 text-[10px] font-mono bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-250 dark:border-slate-800 rounded-md cursor-pointer transition-colors shadow-2xs"
                      >
                        SCH {sch}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850/80 rounded-xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Match successful! Outside diameter is <strong>{od} mm</strong> (DN {dn}) with a wall thickness of <strong>{thickness} mm</strong>.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Visual SVG Pipe Section */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850/60 rounded-2xl relative min-h-[250px]">
          <span className="absolute top-3 left-3 text-[9px] font-mono uppercase tracking-wider text-slate-400">
            Reactive Cross-Section (Scale-to-fit)
          </span>

          {od !== null && thickness !== null ? (
            <div className="w-full flex flex-col items-center justify-center space-y-4 py-2">
              <svg viewBox="0 0 200 200" className="w-40 h-40 drop-shadow-md">
                {/* Outer Pipe Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  className="fill-slate-200 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-600"
                  strokeWidth="0.5"
                />
                
                {/* Shading/Pattern representing the steel material wall */}
                {/* Inside circle radius: (75 * (ID/OD)) */}
                <circle
                  cx="100"
                  cy="100"
                  r={Math.max(10, 75 * (id / od))}
                  className="fill-white dark:fill-slate-950 stroke-slate-400 dark:stroke-slate-600"
                  strokeWidth="0.5"
                />

                {/* Dimension Arrows & text for OD */}
                {/* Horizontal reference line */}
                <line x1="10" y1="100" x2="20" y2="100" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="1" strokeDasharray="2,2" />
                <line x1="180" y1="100" x2="190" y2="100" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="1" strokeDasharray="2,2" />
                
                {/* OD measurement indicator line below pipe */}
                <line x1="25" y1="100" x2="25" y2="185" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="1,2" />
                <line x1="175" y1="100" x2="175" y2="185" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" strokeDasharray="1,2" />
                
                {/* Double sided arrow for OD */}
                <line x1="25" y1="180" x2="175" y2="180" className="stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.2" />
                <polygon points="25,180 32,177 32,183" className="fill-slate-500 dark:fill-slate-400" />
                <polygon points="175,180 168,177 168,183" className="fill-slate-500 dark:fill-slate-400" />
                <rect x="75" y="171" width="50" height="15" rx="3" className="fill-slate-50 dark:fill-slate-950 stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
                <text x="100" y="182" textAnchor="middle" className="font-mono text-[9px] font-bold fill-slate-700 dark:fill-slate-300">
                  {od}mm OD
                </text>

                {/* Thickness indicator callout on upper right quadrant */}
                {/* Outer surface point: 100 + 75*cos(45) = 100 + 53 = 153, 100 - 75*sin(45) = 100 - 53 = 47 */}
                {/* Inner surface point: 100 + r_in*cos(45), 100 - r_in*sin(45) */}
                {(() => {
                  const rInner = Math.max(10, 75 * (id / od));
                  const cos45 = 0.7071;
                  const xOuter = 100 + 75 * cos45;
                  const yOuter = 100 - 75 * cos45;
                  const xInner = 100 + rInner * cos45;
                  const yInner = 100 - rInner * cos45;
                  return (
                    <g>
                      {/* Arrow line pointing to steel thickness */}
                      <line x1={xInner} y1={yInner} x2={xOuter} y2={yOuter} className="stroke-amber-500" strokeWidth="1.5" />
                      <line x1={xOuter} y1={yOuter} x2={165} y2={20} className="stroke-amber-500" strokeWidth="1" strokeDasharray="1,1" />
                      <circle cx={(xOuter + xInner) / 2} cy={(yOuter + yInner) / 2} r="2.5" className="fill-amber-500" />
                      
                      {/* Text callout box */}
                      <rect x="135" y="5" width="60" height="18" rx="4" className="fill-amber-500 text-white shadow-2xs" />
                      <text x="165" y="17" textAnchor="middle" className="font-mono text-[8px] font-bold fill-white">
                        t = {thickness}mm
                      </text>
                    </g>
                  );
                })()}

                {/* ID reference line indicators */}
                {(() => {
                  const rInner = Math.max(10, 75 * (id / od));
                  return (
                    <g>
                      <line x1={100 - rInner} y1="100" x2={100 - rInner} y2="152" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.8" strokeDasharray="2,2" />
                      <line x1={100 + rInner} y1="100" x2={100 + rInner} y2="152" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.8" strokeDasharray="2,2" />
                      <line x1={100 - rInner} y1="148" x2={100 + rInner} y2="148" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1" />
                      <polygon points={`${100 - rInner},148 ${100 - rInner + 5},146 ${100 - rInner + 5},150`} className="fill-slate-400 dark:fill-slate-500" />
                      <polygon points={`${100 + rInner},148 ${100 + rInner - 5},146 ${100 + rInner - 5},150`} className="fill-slate-400 dark:fill-slate-500" />
                      <rect x="85" y="141" width="30" height="13" rx="2" className="fill-slate-50 dark:fill-slate-950 stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.8" />
                      <text x="100" y="150" textAnchor="middle" className="font-mono text-[8px] fill-slate-500 dark:fill-slate-400 font-semibold">
                        ID {id}
                      </text>
                    </g>
                  );
                })()}
              </svg>

              <div className="text-center font-mono text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <p>NPS {record.nps} · Schedule {schInput.toUpperCase()}</p>
                <p className="text-[9px] text-slate-400">Inside Diameter: {id} mm ({((id || 0) / 25.4).toFixed(3)} in)</p>
              </div>
            </div>
          ) : od !== null ? (
            <div className="w-full flex flex-col items-center justify-center space-y-4 py-2 text-center">
              <svg viewBox="0 0 200 200" className="w-36 h-36 opacity-40">
                {/* Only Outer pipe circle is visible */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  className="fill-none stroke-slate-300 dark:stroke-slate-700"
                  strokeWidth="3"
                  strokeDasharray="4,4"
                />
                <text x="100" y="104" textAnchor="middle" className="font-mono text-[10px] fill-slate-400">
                  Select valid schedule
                </text>
              </svg>
              <div className="text-xs text-slate-400 max-w-[200px]">
                Please type a valid wall thickness schedule (e.g. <strong className="text-slate-500">STD</strong>) to see the full cross-sectional scale diagram.
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 py-6">
              <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto animate-pulse" />
              <div className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                Enter a Nominal Pipe Size (NPS) and a thickness Schedule in the input fields to render the reactive cross-section.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
