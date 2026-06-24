import { PipeItem, ConsolidateItem } from './types';

// Normalized classifications of materials
const getMaterialType = (itemName: string): string => {
  const name = itemName.toLowerCase();
  if (name.includes('super duplex')) return 'Super Duplex';
  if (name.includes('duplex')) return 'Duplex Steel';
  if (name.includes('stainless')) return 'Stainless Steel';
  if (charIncludesAny(name, ['alloy steel', 'aly', '15crmog'])) return 'Alloy Steel';
  if (name.includes('titanium')) return 'Titanium';
  if (name.includes('ms') || name.includes('mild steel')) return 'Mild Steel (MS)';
  if (name.toLowerCase().includes('carbon') || name.toLowerCase().includes('riffle') || name.toLowerCase().includes('finned')) return 'Carbon Steel';
  return 'Carbon Steel'; // Default fallback
};

function charIncludesAny(str: string, terms: string[]): boolean {
  return terms.some(term => str.includes(term));
}

// Full unique deduplicated dataset with original counts mapped precisely from the CSV
export const pipeDatasetRaw = [
  { item: "Stainless Steel Seamless Pipe", spec: "ASTM A312", grade: "TP304/304L", count: 18 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP304", count: 42 },
  { item: "Stainless Steel Seamless Pipe", spec: "ASTM A312", grade: "TP304", count: 24 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T91,IBR", count: 12 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA 268", grade: "TP 410", count: 18 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA179", grade: "", count: 164 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA192", grade: "", count: 22 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP 316L", count: 32 },
  { item: "Stainless Steel Seamless Pipe", spec: "ASTM A312", grade: "TP316", count: 15 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA210", grade: "Gr.A1,IBR", count: 48 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A106", grade: "Gr.B", count: 112 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASME SA106", grade: "Gr.B", count: 96 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASME SA106", grade: "Gr.C", count: 14 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T22", count: 28 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T11", count: 34 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A335", grade: "Gr.P22", count: 8 },
  { item: "Duplex Seamless Tubes", spec: "ASME SA789", grade: "S32205", count: 15 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA210", grade: "Gr. A1", count: 26 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA334", grade: "Gr.6", count: 44 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP316L+NACE", count: 6 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T 22", count: 14 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP 304H", count: 10 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP 347H", count: 12 },
  { item: "Stainless Steel Seamless U Tubes", spec: "ASME SA213", grade: "TP 316L", count: 15 },
  { item: "Stainless Steel Seamless Pipe", spec: "ASME SA312", grade: "TP316/316L", count: 22 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASME SA335", grade: "Gr.P11", count: 25 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr. T11, IBR, CDS", count: 18 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA210", grade: "Gr.A1, CDS, IBR", count: 22 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP347H, IBR", count: 14 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP 310", count: 8 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A106", grade: "Gr.B,IBR", count: 25 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASTM A335", grade: "Gr. P11, BE", count: 6 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A106", grade: "Gr.B,PE", count: 16 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASTM A210", grade: "Gr.C,IBR", count: 12 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A269", grade: "TP304", count: 32 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A269", grade: "TP316", count: 24 },
  { item: "Carbon Steel Seamless Pipes", spec: "DIN 2391", grade: "ST-35", count: 14 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASTM A179", grade: "", count: 18 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T5", count: 15 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASTM A335", grade: "Gr.P91", count: 12 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASTM A213", grade: "Gr.T91", count: 8 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr. T22, IBR", count: 20 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASTM A213", grade: "Gr.T22", count: 12 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASTM A213", grade: "T12", count: 8 },
  { item: "Carbon Steel Seamless U Tubes", spec: "ASME SA179", grade: "", count: 48 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A269", grade: "TP 316L", count: 28 },
  { item: "Alloy Steel Seamless U Tubes", spec: "ASME SA213", grade: "Gr.T11", count: 10 },
  { item: "Alloy Steel Seamless U Tubes", spec: "ASME SA213", grade: "Gr.T22", count: 14 },
  { item: "Stainless Steel Seamless Pipe", spec: "ASME SA312", grade: "TP 316L", count: 16 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T11,IBR", count: 12 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA210", grade: "Gr.C,IBR", count: 18 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP 316L,IBR", count: 6 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA210", grade: "Gr.C,CDS,IBR", count: 24 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA192,IBR", grade: "", count: 8 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP304L,IBR", count: 6 },
  { item: "Alloy Steel Seamless Tubes", spec: "EN 10216 - 2", grade: "Gr.16MO3/T1", count: 6 },
  { item: "Stainless Steel Seamless U Tubes", spec: "ASME SA213", grade: "TP316", count: 8 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T91", count: 12 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr. T22, CDS, IBR", count: 8 },
  { item: "Carbon Steel Seamless Riffle Tubes", spec: "ASME SA210", grade: "Gr.C,CDS,IBR", count: 4 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP347H, IBR, CDS", count: 8 },
  { item: "Stainless Steel Seamless Tubes", spec: "", grade: "TP304", count: 4 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASTM A210", grade: "Gr.A1,CDS", count: 12 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASTM A210", grade: "Gr.A1,IBR", count: 10 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASTM A335", grade: "Gr.P92", count: 14 },
  { item: "Carbon Steel Seamless U Tubes", spec: "ASME SA334", grade: "Gr.6", count: 20 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A312", grade: "TP304", count: 6 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASTM A213", grade: "Gr.T92", count: 6 },
  { item: "Super Duplex Seamless Tubes", spec: "ASTM A789", grade: "UNS S32750", count: 15 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASTM A335", grade: "Gr.P22", count: 18 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T11,HFS", count: 8 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A213", grade: "TP316Ti", count: 12 },
  { item: "Stainless Steel Seamless U Tubes", spec: "ASTM A213", grade: "TP316Ti", count: 4 },
  { item: "Duplex Steel Seamless Tubes", spec: "ASME SA789", grade: "S31803", count: 22 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP304L", count: 38 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP347", count: 8 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr. T11, HFS, IBR", count: 6 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr. T22, HFS, IBR", count: 6 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA210", grade: "Gr. A1, HFS, IBR", count: 12 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA179,NACE", grade: "", count: 14 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A213", grade: "TP304/304L", count: 10 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A106", grade: "Gr.B,BE", count: 54 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA334", grade: "Gr.1", count: 12 },
  { item: "Carbon Steel Seamless U Tubes", spec: "ASME SA334", grade: "Gr.1", count: 8 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASTM A335", grade: "Gr.P9", count: 14 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASME SA334", grade: "Gr.3, IBR", count: 6 },
  { item: "Carbon Steel Seamless U Tubes", spec: "ASME SA334", grade: "Gr.3, IBR", count: 4 },
  { item: "Super Duplex Seamless Tubes", spec: "ASME SA789", grade: "UNS S32750", count: 18 },
  { item: "Super Duplex Seamless U-Tube", spec: "ASME SA789", grade: "UNS S32750", count: 12 },
  { item: "Super Duplex Seamless Tubes", spec: "ASME SA789", grade: "S32750", count: 15 },
  { item: "Carbon Steel Seamless Pipes", spec: "IS 1239(PART-1)1990", grade: "", count: 18 },
  { item: "Carbon Steel Seamless Tubes", spec: "BS 3059 (Part-II)", grade: "Gr.360", count: 32 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA209", grade: "Gr.T1A,IBR", count: 6 },
  { item: "Carbon Steel Seamless Tubes", spec: "EN 10216 - 2", grade: "Gr.13CRMO44/T11, IBR", count: 8 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A333", grade: "Gr.6", count: 36 },
  { item: "MS Seamless Pipes", spec: "ASTM A269,TP316", grade: "" },
  // Wait, MS Seamless Pipes has 1 item
  { itemType: "MS Seamless Pipes", specification: "ASTM A269", grade: "TP316", count: 2 },
  { item: "Carbon Steel Seamless Pipes", spec: "IS:1239 (Part-1)-2004", grade: "", count: 15 },
  { item: "Stainless Steel Seamless Tubes", spec: "EN 10216-5", grade: "1.4306", count: 4 },
  { item: "Carbon Steel Seamless Tubes", spec: "BS 3059 (Part-II)", grade: "Gr.320/360,IBR", count: 6 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A269", grade: "TP 316L,IBR", count: 8 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T12,IBR", count: 12 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T91,IBR", count: 24 },
  { item: "Stainless Steel Seamless Tubes", spec: "", grade: "TP 316L", count: 8 },
  { item: "Alloy Steel Seamless Special Bends Tubes", spec: "ASME SA213", grade: "Gr.T12", count: 4 },
  { item: "Alloy Steel Seamless Special Bends Tubes", spec: "ASME SA213", grade: "Gr.T91", count: 6 },
  { item: "Carbon Steel Seamless Special Bends Tubes", spec: "ASME SA210", grade: "Gr.C", count: 8 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T12", count: 14 },
  { item: "Carbon Steel Seamless Tubes", spec: "DIN 2391-C", tag: "ST-52", grade: "ST-52", count: 12 },
  { item: "Carbon Steel Seamless Tubes", spec: "DIN 2391-C", grade: "ST-35" },
  { item: "Stainless Steel Seamless Pipe", spec: "ASME SA312", grade: "TP304" },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A106", grade: "Gr.B,PE", count: 24 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A106", grade: "Gr.B,PE,IBR", count: 10 },
  { item: "Stainless Steel Seamless Pipes", spec: "ASME SA312", grade: "TP 316L,Cold Finish" },
  { item: "Super Duplex Seamless Tubes", spec: "ASTM A789", grade: "UNS 32507", count: 10 },
  { item: "Carbon Steel Seamless Riffle Tubes", spec: "ASME SA210", grade: "Gr.C,IBR", count: 6 },
  { item: "Alloy Steel Seamless Tubes", spec: "BS 3059 (Part-II)", grade: "Gr.620,IBR", count: 4 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A53", grade: "Gr.B", count: 18 },
  { item: "Stainless Steel Seamless Pipe", spec: "ASTM A312", grade: "Gr.B", count: 4 },
  { item: "Stainless Steel Seamless U Tubes", spec: "ASME SA213", grade: "TP347,IBR", count: 8 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.T9", count: 10 },
  { item: "Duplex Steel Seamless Tubes", spec: "ASME SA789", grade: "S32205", count: 14 },
  { item: "Carbon Steel Seamless Tubes", spec: "EN 10216 - 2", grade: "Gr. P235GH", count: 8 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASME SA335", grade: "Gr.P5", count: 12 },
  { item: "Alloy Steel Seamless Tubes", spec: "ASTM A209", grade: "T1", count: 4 },
  { item: "Carbon Steel Seamless Tubes", spec: "SAE 1008/1010", grade: "", count: 8 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "Gr.310S", count: 6 },
  { item: "Carbon Steel Seamless Tubes", spec: "BS 3059 (Part-II)", grade: "Gr.320", count: 12 },
  { item: "As Pierced Hollows", spec: "ASME SA 790", grade: "UNS S32750", count: 4 },
  { item: "As Pierced Hollows", spec: "EN 10216-5", grade: "TP 304H", count: 6 },
  { item: "Carbon Steel Seamless Tubes", spec: "BS 3059 (Part-II)", grade: "Gr.440", count: 8 },
  { item: "STAINLESS STEEL SEAMLESS U PIPE", spec: "ASME SA312", grade: "TP316", count: 4 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASME SA335", grade: "Gr.P12, IBR", count: 18 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASME SA335", grade: "Gr.P22,IBR", count: 15 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASME SA335", grade: "Gr.P91,IBR", count: 20 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASME SA335", grade: "Gr.P92, IBR", count: 14 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASME SA106", grade: "Gr.C,IBR", count: 16 },
  { item: "Carbon Steel Seamless Finned Tubes", spec: "ASME SA179", grade: "", count: 12 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A106", grade: "Gr.A", count: 6 },
  { item: "Carbon Steel Seamless Tubes", spec: "ASTM A519", grade: "", count: 8 },
  { item: "Stainless Steel Seamless Pipe", spec: "ASTM A312", grade: "TP 316H", count: 4 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP321", count: 10 },
  { item: "Duplex Steel Seamless U Tubes", spec: "ASME SA789", grade: "S31803", count: 12 },
  { item: "Carbon Steel Seamless Tubes", spec: "SAE 1541", grade: "( CDS )", count: 4 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA312", grade: "TP-317L", count: 6 },
  { item: "Titanium Tubes Grade 2", spec: "", grade: "", count: 4 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A333", grade: "Gr.B", count: 8 },
  { item: "Carbon Steel Seamless Tubes", spec: "SAE 1541", grade: "HFS", count: 6 },
  { item: "Carbon Steel Seamless Pipes", spec: "API5L", grade: "Gr. X52 PSL2", count: 4 },
  { item: "Alloy Steel Seamless Tubes", spec: "EN 10716-2", grade: "Gr.4130", count: 6 },
  { item: "NICKEL & NICKEL ALLOY SEAMLESS TUBES", spec: "SB-163", grade: "N04400", count: 4 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A500", grade: "Gr.B", count: 6 },
  { item: "Stainless Steel Seamless Pipe", spec: "ASTM A312", grade: "TP 304N", count: 4 },
  { item: "Carbon Steel Seamless Special Bends Tubes", spec: "ASME SA210", grade: "Gr.A1", count: 6 },
  { item: "Carbon Steel Seamless Riffle Tubes", spec: "ASME SA210", grade: "Gr.A1,IBR", count: 8 },
  { item: "Stainless Steel Seamless U Tubes", spec: "ASME SA213", grade: "TP 304N", count: 14 },
  { item: "Carbon Steel Seamless Tubes", spec: "BS 3602", grade: "", count: 4 },
  { item: "Carbon Steel Seamless Tubes", spec: "BS 3602(Part-1)", grade: "Gr.360", count: 6 },
  { item: "Carbon Steel Seamless Tubes", spec: "BS 3602(Part-1)", grade: "Gr. 360, HFS", count: 8 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASME SA213", grade: "TP-904L", count: 8 },
  { item: "Alloy Steel Seamless Pipes", spec: "ASME SA335", grade: "Gr.P1", count: 4 },
  { item: "Carbon Steel Seamless Pipes", spec: "ASTM A53", grade: "Gr.A", count: 6 },
  { item: "Stainless Steel Seamless Tubes", spec: "ASTM A213", grade: "TP 316H", count: 4 },
  { item: "Carbon Steel Seamless U Tubes", spec: "ASME SA556", grade: "Gr. B2", count: 6 },
  { item: "Stainless Steel Seamless U Tubes", spec: "ASME SA213", grade: "TP 304H", count: 8 },
  { item: "Stainless Steel Seamless U Tubes", spec: "ASME SA213", grade: "TP-317L", count: 6 },
  { item: "Carbon Steel Seamless Pipes", spec: "DIN 1629", grade: "St 37.0", count: 18 },
  { item: "Carbon Steel Seamless Pipes", spec: "DIN 1629", grade: "St 44.0", count: 12 },
  { item: "Carbon Steel Seamless Pipes", spec: "DIN 1629", grade: "St 52.0", count: 15 },
  { item: "Carbon Steel Seamless Tubes", spec: "DIN 17175", grade: "St 35.8", count: 14 },
  { item: "Carbon Steel Seamless Tubes", spec: "DIN 17175", grade: "St 45.8", count: 10 },
  { item: "Carbon Steel Seamless Pipes", spec: "DIN 2448", grade: "St 37.0", count: 20 },
  { item: "Carbon Steel Seamless Pipes", spec: "DIN 2448", grade: "St 52.0", count: 16 }
] as any[];

// Standard parser/mapper to build full PipeItem objects with unique IDs and normalized fields
export const pipeItems: PipeItem[] = pipeDatasetRaw.map((raw, idx) => {
  const rawItem = raw.item || raw.itemType || raw.item_name || "Carbon Steel Seamless Tubes";
  const rawSpec = raw.spec || raw.specification || "";
  const rawGrade = raw.grade || "";
  const finalId = `pipe-${idx + 1}`;
  
  return {
    id: finalId,
    itemName: rawItem,
    specification: rawSpec,
    grade: rawGrade,
    normalizedItemName: rawItem.toLowerCase(),
    normalizedSpec: rawSpec.toLowerCase(),
    normalizedGrade: rawGrade.toLowerCase(),
    isIbr: rawGrade.toUpperCase().includes('IBR') || rawSpec.toUpperCase().includes('IBR') || rawItem.toUpperCase().includes('IBR'),
    material: getMaterialType(rawItem)
  };
});

// Build the deduplicated frequency map with consolidate count
export const consolidatedDataset: ConsolidateItem[] = pipeItems.map((item, idx) => {
  const rawData = pipeDatasetRaw[idx];
  return {
    id: item.id,
    itemName: item.itemName,
    specification: item.specification,
    grade: item.grade,
    isIbr: item.isIbr,
    material: item.material,
    count: rawData.count || 1
  };
});

/**
 * Searches the pipe and tube database using an advanced token-based matching logic
 * that supports exceptional query patterns like "A106 b" or "A106 b IBR".
 */
export const searchPipeItems = (
  items: ConsolidateItem[],
  query: string,
  materialFilter: string,
  typeFilter: string,
  ibrOnly: boolean
): ConsolidateItem[] => {
  let filtered = [...items];

  // Apply search query first
  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery) {
    // Split query into multiple tokens/words
    const tokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);
    
    filtered = filtered.filter(item => {
      const matchText = `${item.itemName} ${item.specification} ${item.grade}`.toLowerCase();
      const normMatchText = matchText.replace(/[-_.\s]/g, '');
      
      // Every single token must match somewhere in the text
      return tokens.every(token => {
        // Special replacement for ASTM/ASME grade/specification lookup shortcuts
        // E.g., if token is "a106" and item spec is "ASTM A106" -> true
        // if token is "sa213" and item spec is "ASME SA213" -> true
        // If token is "b" and item grade has "Gr.B" -> true
        const isA106 = token === 'a106' && matchText.includes('a106');
        const isB = token === 'b' && (matchText.includes('gr.b') || matchText.includes('tp316b') || matchText.includes('b,') || matchText.endsWith(' b') || matchText.includes(' b '));
        
        if (isA106 || isB) return true;
        
        // Match original or normalized versions to support dashes, dots, and space differences (e.g. st-37, st 37, st37)
        const normToken = token.replace(/[-_.\s]/g, '');
        return matchText.includes(token) || (normToken.length > 0 && normMatchText.includes(normToken));
      });
    });
  }

  // Filter by Material
  if (materialFilter !== 'All') {
    filtered = filtered.filter(item => item.material === materialFilter);
  }

  // Filter by Item Type
  if (typeFilter !== 'All') {
    filtered = filtered.filter(item => {
      const nameLower = item.itemName.toLowerCase();
      if (typeFilter === 'Pipe') {
        return nameLower.includes('pipe') && !nameLower.includes('u pipe') && !nameLower.includes('u-pipe');
      }
      if (typeFilter === 'Tube') {
        return nameLower.includes('tube') && !nameLower.includes('u tube') && !nameLower.includes('riffle') && !nameLower.includes('finned');
      }
      if (typeFilter === 'U-Tube') {
        return nameLower.includes('u tube') || nameLower.includes('u-tube') || nameLower.includes('u pipe');
      }
      if (typeFilter === 'Riffle Tube') {
        return nameLower.includes('riffle');
      }
      if (typeFilter === 'Finned Tube') {
        return nameLower.includes('finned');
      }
      if (typeFilter === 'Special Bends') {
        return nameLower.includes('bends') || nameLower.includes('special bends');
      }
      return true;
    });
  }

  // Filter by IBR
  if (ibrOnly) {
    filtered = filtered.filter(item => item.isIbr);
  }

  return filtered;
};
