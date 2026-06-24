export interface PipeItem {
  id: string;
  itemName: string;
  specification: string;
  grade: string;
  normalizedItemName: string;
  normalizedSpec: string;
  normalizedGrade: string;
  isIbr: boolean;
  material: string;
}

export interface ConsolidateItem {
  id: string;
  itemName: string;
  specification: string;
  grade: string;
  isIbr: boolean;
  material: string;
  count: number; // Number of duplicates in original sheet
}

export interface FilterState {
  searchQuery: string;
  material: string; // 'All', 'Stainless Steel', 'Carbon Steel', 'Alloy Steel', 'Duplex', 'Super Duplex', 'Other'
  itemType: string; // 'All', 'Pipe', 'Tube', 'U-Tube', 'Riffle Tube', 'Other'
  ibrOnly: boolean;
  consolidate: boolean;
}
