/**
 * Export utilities for EventGraph
 * Supports PDF, Excel, and PNG exports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import type { Guest, GuestGroup, ExpenseItem, AppState } from '../types';

// =============================================================================
// ACCESS CONTROL
// =============================================================================

/**
 * Check if user can export based on their plan
 * TODO: Change to `return plan !== 'free'` when you want to restrict exports to Pro+
 */
export function canExport(_plan: string = 'free'): boolean {
  return true;
}

// =============================================================================
// SOCIAL TREE ANALYSIS
// =============================================================================

interface SocialTreeNode {
  guest: Guest;
  level: number; // 0 = root, 1 = direct connection, 2 = 2nd degree, etc.
  chain: string[]; // Names from this guest up to the root
  childCount: number; // How many people this guest brought (direct + indirect)
  isRoot: boolean;
}

/**
 * Build the social tree from guests
 * Roots are determined by: guest.isRoot === true, or if not set, guests without parentId
 */
function buildSocialTree(guests: Guest[]): Map<string, SocialTreeNode> {
  const guestById = new Map(guests.map(g => [g.id, g]));
  const treeNodes = new Map<string, SocialTreeNode>();
  
  // Helper to check if a guest is a root
  const isGuestRoot = (guest: Guest): boolean => {
    // If isRoot is explicitly set, use that
    if (guest.isRoot === true) return true;
    if (guest.isRoot === false) return false;
    // Fallback: no parentId = root
    return !guest.parentId;
  };
  
  // First pass: identify roots and calculate levels
  const calculateLevel = (guest: Guest, visited: Set<string> = new Set()): SocialTreeNode => {
    // Prevent infinite loops
    if (visited.has(guest.id)) {
      return { guest, level: 0, chain: [], childCount: 0, isRoot: true };
    }
    visited.add(guest.id);
    
    // Check if already calculated
    const existing = treeNodes.get(guest.id);
    if (existing) return existing;
    
    // Check if guest is a root
    if (isGuestRoot(guest)) {
      const node: SocialTreeNode = { 
        guest, 
        level: 0, 
        chain: [guest.name], 
        childCount: 0, 
        isRoot: true 
      };
      treeNodes.set(guest.id, node);
      return node;
    }
    
    // Has parent - calculate based on parent
    const parent = guest.parentId ? guestById.get(guest.parentId) : null;
    if (!parent) {
      // Parent not found, treat as root
      const node: SocialTreeNode = { 
        guest, 
        level: 0, 
        chain: [guest.name], 
        childCount: 0, 
        isRoot: true 
      };
      treeNodes.set(guest.id, node);
      return node;
    }
    
    const parentNode = calculateLevel(parent, visited);
    const node: SocialTreeNode = {
      guest,
      level: parentNode.level + 1,
      chain: [...parentNode.chain, guest.name],
      childCount: 0,
      isRoot: false,
    };
    treeNodes.set(guest.id, node);
    return node;
  };
  
  // Calculate levels for all guests
  guests.forEach(guest => calculateLevel(guest));
  
  // Second pass: calculate child counts (influence)
  guests.forEach(guest => {
    if (guest.parentId && !isGuestRoot(guest)) {
      // Walk up the tree and increment child count
      let currentId: string | undefined = guest.parentId;
      const visited = new Set<string>();
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = treeNodes.get(currentId);
        if (node) {
          node.childCount++;
          const parentGuest = guestById.get(currentId);
          // Stop if we reach a root
          if (parentGuest && isGuestRoot(parentGuest)) break;
          currentId = parentGuest?.parentId;
        } else {
          break;
        }
      }
    }
  });
  
  return treeNodes;
}

/**
 * Format the connection chain for display
 */
function formatConnectionChain(node: SocialTreeNode): string {
  if (node.isRoot) {
    return 'Host';
  }
  
  // Remove the guest's own name from the chain (last element)
  const ancestors = node.chain.slice(0, -1);
  
  if (ancestors.length === 0) {
    return 'Host';
  }
  
  if (ancestors.length === 1) {
    return `-> ${ancestors[0]}`;
  }
  
  // Show chain: Via Root → Parent
  // Reverse to show from root to direct parent
  return `-> ${ancestors.join(' -> ')}`;
}

/**
 * Get level label
 */
function getLevelLabel(level: number): string {
  if (level === 0) return 'Direto';
  if (level === 1) return '1º grau';
  if (level === 2) return '2º grau';
  return `${level}º grau`;
}

// =============================================================================
// PDF EXPORT
// =============================================================================

interface PDFExportOptions {
  guests: Guest[];
  groups: GuestGroup[];
  eventName: string;
  eventDate?: string | null;
}

/**
 * Export guest list to PDF with tree visualization per root
 * New design: Each root gets its own section with indented descendants
 */
export async function exportGuestsToPDF(options: PDFExportOptions): Promise<void> {
  const { guests, groups, eventName, eventDate } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Build social tree for connection analysis
  const socialTree = buildSocialTree(guests);
  
  // Create group lookup
  const groupById = new Map(groups.map(g => [g.id, g]));
  const guestById = new Map(guests.map(g => [g.id, g]));
  
  // =========================================================================
  // COLOR NORMALIZATION (make group colors consistent + robust parsing)
  // =========================================================================
  const FALLBACK_RGB: [number, number, number] = [100, 116, 139]; // slate-500
  const PALETTE = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#f59e0b', // amber-500
    '#84cc16', // lime-500
    '#22c55e', // green-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
    '#ec4899', // pink-500
  ];

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const hashString = (s: string): number => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  };

  const parseColorToRgb = (raw: string | undefined | null): [number, number, number] | null => {
    if (!raw) return null;
    const s = raw.trim();

    // #RGB
    const shortHex = /^#([0-9a-f]{3})$/i.exec(s);
    if (shortHex) {
      const h = shortHex[1];
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return [r, g, b];
    }

    // #RRGGBB
    const hex = /^#?([0-9a-f]{6})$/i.exec(s);
    if (hex) {
      const h = hex[1];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return [r, g, b];
    }

    // rgb()/rgba()
    const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0?\.\d+|1(?:\.0+)?)\s*)?\)$/i.exec(s);
    if (rgb) {
      const r = Math.max(0, Math.min(255, Number(rgb[1])));
      const g = Math.max(0, Math.min(255, Number(rgb[2])));
      const b = Math.max(0, Math.min(255, Number(rgb[3])));
      return [r, g, b];
    }

    return null;
  };

  const pickPaletteRgb = (seed: string): [number, number, number] => {
    const idx = hashString(seed) % PALETTE.length;
    const parsed = parseColorToRgb(PALETTE[idx]);
    return parsed ?? FALLBACK_RGB;
  };

  const isNearlyGray = ([r, g, b]: [number, number, number]) =>
    Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && Math.abs(r - b) < 12;

  const rgbToHsl = ([r0, g0, b0]: [number, number, number]): [number, number, number] => {
    const r = r0 / 255;
    const g = g0 / 255;
    const b = b0 / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

    if (d !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / d) % 6;
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    return [h, s, l];
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  };

  const harmonizeRgb = (rgb: [number, number, number]): [number, number, number] => {
    // If it's gray-ish, it won't look like a group color -> use palette instead
    if (isNearlyGray(rgb)) return rgb;
    const [h, s0, l0] = rgbToHsl(rgb);
    const s = clamp01(Math.max(0.58, Math.min(0.82, s0)));
    const l = clamp01(Math.max(0.45, Math.min(0.58, l0)));
    return hslToRgb(h, s, l);
  };

  const getNiceGroupRgb = (groupColor: string | undefined | null, seed: string): [number, number, number] => {
    const parsed = parseColorToRgb(groupColor);
    const base = parsed ? (isNearlyGray(parsed) ? pickPaletteRgb(seed) : parsed) : pickPaletteRgb(seed);
    return harmonizeRgb(base);
  };
  
  // =========================================================================
  // BUILD TREE STRUCTURE
  // =========================================================================
  
  interface TreeItem {
    guest: Guest;
    node: SocialTreeNode;
    level: number;
    children: TreeItem[];
    parent?: TreeItem;
  }
  
  // Build hierarchical tree for each root
  const buildTreeForRoot = (rootGuest: Guest): TreeItem => {
    const rootNode = socialTree.get(rootGuest.id)!;
    const root: TreeItem = {
      guest: rootGuest,
      node: rootNode,
      level: 0,
      children: [],
    };
    
    // Find all descendants recursively
    const findChildren = (parent: TreeItem): void => {
      const children = guests.filter(g => g.parentId === parent.guest.id);
      for (const child of children) {
        const childNode = socialTree.get(child.id);
        if (childNode) {
          const childItem: TreeItem = {
            guest: child,
            node: childNode,
            level: parent.level + 1,
            children: [],
            parent,
          };
          parent.children.push(childItem);
          findChildren(childItem);
        }
      }
      // Sort children by influence (descending)
      parent.children.sort((a, b) => b.node.childCount - a.node.childCount);
    };
    
    findChildren(root);
    return root;
  };
  
  // Get all roots and build their trees
  const roots = guests.filter(g => {
    const node = socialTree.get(g.id);
    return node?.isRoot;
  }).sort((a, b) => {
    const nodeA = socialTree.get(a.id);
    const nodeB = socialTree.get(b.id);
    return (nodeB?.childCount || 0) - (nodeA?.childCount || 0);
  });
  
  const trees = roots.map(r => buildTreeForRoot(r));
  
  // Flatten tree to list with levels
  const flattenTree = (tree: TreeItem): Array<{ guest: Guest; node: SocialTreeNode; depth: number; isLast: boolean[] }> => {
    const result: Array<{ guest: Guest; node: SocialTreeNode; depth: number; isLast: boolean[] }> = [];
    
    const traverse = (item: TreeItem, depth: number, isLastPath: boolean[]): void => {
      result.push({ 
        guest: item.guest, 
        node: item.node, 
        depth, 
        isLast: [...isLastPath] 
      });
      
      item.children.forEach((child, index) => {
        const isLastChild = index === item.children.length - 1;
        traverse(child, depth + 1, [...isLastPath, isLastChild]);
      });
    };
    
    traverse(tree, 0, []);
    return result;
  };
  
  // =========================================================================
  // STATS
  // =========================================================================
  
  const confirmedCount = guests.filter(g => g.confirmed).length;
  const pendingCount = guests.length - confirmedCount;
  const confirmRate = guests.length > 0 ? Math.round((confirmedCount / guests.length) * 100) : 0;
  const rootCount = roots.length;
  
  // =========================================================================
  // HEADER PAGE
  // =========================================================================
  
  // Header background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Title
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(eventName, pageWidth / 2, 18, { align: 'center' });
  
  // Subtitle with date
  doc.setFontSize(12);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateText = eventDate 
    ? new Date(eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Data não definida';
  doc.text(dateText, pageWidth / 2, 28, { align: 'center' });
  
  // Stats bar
  doc.setFontSize(10);
  const statsY = 42;
  const statsSpacing = 45;
  const statsStartX = (pageWidth - (4 * statsSpacing)) / 2 + 10;
  
  doc.setTextColor(20, 184, 166); // teal-500
  doc.text(`${guests.length} convidados`, statsStartX, statsY);
  doc.setTextColor(34, 197, 94); // green-500
  doc.text(`${confirmedCount} confirmados`, statsStartX + statsSpacing, statsY);
  doc.setTextColor(251, 146, 60); // orange-400
  doc.text(`${pendingCount} pendentes`, statsStartX + statsSpacing * 2, statsY);
  doc.setTextColor(167, 139, 250); // violet-400
  doc.text(`${rootCount} hosts`, statsStartX + statsSpacing * 3, statsY);
  
  // Subtitle
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Arvore Social - Visualizacao hierarquica por host', pageWidth / 2, 52, { align: 'center' });
  
  let currentY = 65;
  
  // =========================================================================
  // RENDER EACH ROOT AS A SECTION
  // =========================================================================
  
  trees.forEach((tree, treeIndex) => {
    const flatList = flattenTree(tree);
    const rootGuest = tree.guest;
    const rootNode = tree.node;
    const rootGroup = groupById.get(rootGuest.groupId);
    const totalInTree = flatList.length;
    const confirmedInTree = flatList.filter(f => f.guest.confirmed).length;
    
    // Check if we need a new page for this section
    const estimatedHeight = 25 + (flatList.length * 7);
    if (currentY + Math.min(estimatedHeight, 120) > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
    
    // -----------------------------------------------------------------------
    // ROOT HEADER BOX
    // -----------------------------------------------------------------------
    const headerHeight = 20;
    const rgb = getNiceGroupRgb(rootGroup?.color, rootGroup?.id || `group:${rootGuest.groupId || rootGuest.id}`);
    const cardX = 14;
    const cardW = pageWidth - 28;
    const cardRight = cardX + cardW;
    const badgeW = 22;
    const badgeH = 8;
    const badgeGap = 6;
    
    // Main header background
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(cardX, currentY, cardW, headerHeight, 3, 3, 'F');
    
    // Left color accent bar
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.roundedRect(cardX, currentY, 4, headerHeight, 1, 1, 'F');
    
    // Root name (large)
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(rootGuest.name.toUpperCase(), 24, currentY + 9);
    
    // Host badge (fixed position)
    const badgeX = cardRight - badgeGap - badgeW;
    doc.setFillColor(139, 92, 246); // violet-500
    doc.roundedRect(badgeX, currentY + 3, badgeW, badgeH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text('HOST', badgeX + badgeW / 2, currentY + 8.5, { align: 'center' });
    
    // Stats on the right
    const statsText = `${totalInTree} pessoas | +${rootNode.childCount} trouxe`;
    const statsRightX = badgeX - 4;
    const statsMaxW = statsRightX - 24;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(doc.getTextWidth(statsText) > statsMaxW ? 8 : 9);
    doc.text(statsText, statsRightX, currentY + 9, { align: 'right' });
    
    // Group name below
    doc.setFontSize(8);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(rootGroup?.name || 'Sem grupo', 24, currentY + 16);
    
    // Confirmed count
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`${confirmedInTree} confirmados`, statsRightX, currentY + 16, { align: 'right' });
    
    currentY += headerHeight + 4;
    
    // -----------------------------------------------------------------------
    // TREE TABLE FOR THIS ROOT
    // -----------------------------------------------------------------------
    
    interface TreeTableRow {
      name: string;
      via: string;
      influence: string;
      status: string;
      depth: number;
      groupColor: string;
      confirmed: boolean;
      influenceNum: number;
    }
    
    const tableRows: TreeTableRow[] = flatList.slice(1).map(item => { // Skip root (already in header)
      const group = groupById.get(item.guest.groupId);
      const parentGuest = item.guest.parentId ? guestById.get(item.guest.parentId) : null;
      
      return {
        name: item.guest.name,
        via: parentGuest ? `via ${parentGuest.name}` : '',
        influence: item.node.childCount > 0 ? `+${item.node.childCount}` : '',
        status: item.guest.confirmed ? 'OK' : 'Pend.',
        depth: item.depth,
        groupColor: group?.color || '#64748b',
        confirmed: item.guest.confirmed,
        influenceNum: item.node.childCount,
      };
    });
    
    if (tableRows.length > 0) {
      const innerTableW = pageWidth - 28; // matches card width (14 left/right)
      const colColorW = 3;
      const colStatusW = 16;
      const colInfluenceW = 18;
      const colViaW = 42;
      const colNameW = Math.max(60, innerTableW - (colColorW + colViaW + colInfluenceW + colStatusW));

      autoTable(doc, {
        startY: currentY,
        head: [['', 'Convidado', 'Conexao', 'Trouxe', 'Status']],
        body: tableRows.map(row => [
          '', // Color indicator
          row.name,
          row.via,
          row.influence,
          row.status,
        ]),
        headStyles: {
          fillColor: [241, 245, 249], // slate-100
          textColor: [71, 85, 105], // slate-600
          fontStyle: 'bold',
          fontSize: 7,
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [241, 245, 249], // slate-100
          lineWidth: 0.1,
          font: 'helvetica',
          overflow: 'ellipsize',
        },
        columnStyles: {
          0: { cellWidth: colColorW }, // Color indicator
          1: { cellWidth: colNameW }, // Convidado (indented via paddingLeft)
          2: { cellWidth: colViaW, font: 'helvetica', textColor: [148, 163, 184] }, // Conexão
          3: { cellWidth: colInfluenceW, halign: 'center', font: 'helvetica' }, // Trouxe
          4: { cellWidth: colStatusW, halign: 'center', font: 'helvetica' }, // Status
        },
        margin: { left: 14, right: 14 },
        tableWidth: innerTableW,
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const rowData = tableRows[data.row.index];
            if (rowData) {
              const rowRgb = getNiceGroupRgb(rowData.groupColor, `row:${rowData.groupColor || 'none'}`);
              doc.setFillColor(rowRgb[0], rowRgb[1], rowRgb[2]);
              doc.roundedRect(data.cell.x + 0.5, data.cell.y + 1, 2, data.cell.height - 2, 0.5, 0.5, 'F');
            }
          }
        },
        didParseCell: (data) => {
          const rowData = tableRows[data.row.index];
          if (!rowData || data.section !== 'body') return;

          // Indent based on depth (no unicode tree chars to avoid broken rendering)
          if (data.column.index === 1) {
            // cellPadding can be number | object | [top,right,bottom,left]; normalize to object
            const normalizePadding = (
              padding: unknown
            ): { top: number; right: number; bottom: number; left: number } => {
              if (typeof padding === 'number') {
                return { top: padding, right: padding, bottom: padding, left: padding };
              }
              if (Array.isArray(padding)) {
                const [top, right, bottom, left] = padding as number[];
                return {
                  top: typeof top === 'number' ? top : 1.5,
                  right: typeof right === 'number' ? right : 1.5,
                  bottom: typeof bottom === 'number' ? bottom : 1.5,
                  left: typeof left === 'number' ? left : 1.5,
                };
              }
              if (padding && typeof padding === 'object') {
                const p = padding as { top?: number; right?: number; bottom?: number; left?: number };
                return {
                  top: p.top ?? 1.5,
                  right: p.right ?? 1.5,
                  bottom: p.bottom ?? 1.5,
                  left: p.left ?? 1.5,
                };
              }
              return { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 };
            };

            const basePadding = normalizePadding(data.cell.styles.cellPadding);

            const indent = Math.min(18, rowData.depth * 4); // cap indentation
            data.cell.styles.cellPadding = { ...basePadding, left: basePadding.left + indent };

            // Slightly de-emphasize deeper nodes
            if (rowData.depth >= 3) {
              data.cell.styles.textColor = [100, 116, 139]; // slate-500
            } else {
              data.cell.styles.textColor = [30, 41, 59]; // slate-800
            }
          }
          
          // Highlight high influence
          if (data.column.index === 3) {
            if (rowData.influenceNum >= 5) {
              data.cell.styles.textColor = [239, 68, 68]; // red-500
              data.cell.styles.fontStyle = 'bold';
            } else if (rowData.influenceNum >= 2) {
              data.cell.styles.textColor = [251, 146, 60]; // orange-400
            } else if (rowData.influenceNum > 0) {
              data.cell.styles.textColor = [34, 197, 94]; // green-500
            } else {
              data.cell.styles.textColor = [203, 213, 225];
            }
          }
          
          // Status color
          if (data.column.index === 4) {
            if (rowData.confirmed) {
              data.cell.styles.textColor = [34, 197, 94];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [251, 146, 60];
            }
          }
        },
      });
      
      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    } else {
      // No descendants - small note
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Nenhum convidado conectado a este host', 20, currentY + 5);
      currentY += 15;
    }
  });
  
  // =========================================================================
  // TOP INFLUENCERS PAGE
  // =========================================================================
  
  // Check if we need new page
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = 20;
  }
  
  // Find top influencers across all trees
  const allInfluencers = guests
    .map(g => ({ guest: g, node: socialTree.get(g.id)!, group: groupById.get(g.groupId) }))
    .filter(i => i.node && i.node.childCount > 0)
    .sort((a, b) => b.node.childCount - a.node.childCount)
    .slice(0, 10);
  
  if (allInfluencers.length > 0) {
    // Header
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(14, currentY, pageWidth - 28, 18, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('TOP 10 INFLUENCIADORES', 20, currentY + 11);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Quem trouxe mais convidados para o evento', pageWidth - 20, currentY + 11, { align: 'right' });
    
    currentY += 22;
    
    // Influencer cards (2 columns)
    const colWidth = (pageWidth - 38) / 2;
    allInfluencers.forEach((inf, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 14 + (col * (colWidth + 10));
      const y = currentY + (row * 16);
      
      if (y > pageHeight - 25) return;
      
      const infRgb = getNiceGroupRgb(inf.group?.color, inf.group?.id || `inf:${inf.guest.groupId || inf.guest.id}`);
      
      // Card background
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, colWidth, 14, 2, 2, 'F');
      
      // Rank circle
      doc.setFillColor(infRgb[0], infRgb[1], infRgb[2]);
      doc.circle(x + 8, y + 7, 5, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`${i + 1}`, x + 8, y + 9, { align: 'center' });
      
      // Name
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(inf.guest.name, x + 16, y + 9);
      
      // Count badge
      doc.setFillColor(20, 184, 166);
      doc.roundedRect(x + colWidth - 22, y + 3, 18, 8, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`+${inf.node.childCount}`, x + colWidth - 13, y + 8.5, { align: 'center' });
    });
    
    currentY += Math.ceil(allInfluencers.length / 2) * 16 + 10;
  }
  
  // =========================================================================
  // GROUP SUMMARY
  // =========================================================================
  
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }
  
  const groupStats = groups.map(group => {
    const groupGuests = guests.filter(g => g.groupId === group.id);
    const confirmedG = groupGuests.filter(g => g.confirmed).length;
    const rootsInGroup = groupGuests.filter(g => socialTree.get(g.id)?.isRoot).length;
    return {
      name: group.name,
      color: group.color,
      total: groupGuests.length,
      confirmed: confirmedG,
      roots: rootsInGroup,
    };
  }).filter(g => g.total > 0).sort((a, b) => b.total - a.total);
  
  if (groupStats.length > 0 && currentY < pageHeight - 30) {
    // Header for group summary
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(14, currentY, pageWidth - 28, 14, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('RESUMO POR GRUPO', 20, currentY + 9);
    
    currentY += 18;
    
    let xPos = 14;
    let yPos = currentY;
    
    groupStats.forEach((group, index) => {
      const rgb = getNiceGroupRgb(group.color, group.name);
      
      // Color dot
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.circle(xPos + 2, yPos, 2, 'F');
      
      // Group name and count
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${group.name}: ${group.confirmed}/${group.total} (${group.roots} dir.)`, xPos + 6, yPos + 1);
      
      xPos += 50;
      if (xPos > 150 || index === groupStats.length - 1) {
        xPos = 14;
        yPos += 7;
      }
    });
  }
  
  // =========================================================================
  // ADD FOOTER TO ALL PAGES
  // =========================================================================
  
  const totalPages = doc.getNumberOfPages();
  const footerText = `Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')} | EventGraph`;
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    
    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(footerText, 14, pageHeight - 4);
    
    // Page number
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 4, { align: 'right' });
  }
  
  // Save
  const fileName = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_arvore_social_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// =============================================================================
// EXCEL EXPORT
// =============================================================================

interface ExcelExportOptions {
  state: AppState;
  eventName: string;
  eventDate?: string | null;
}

/**
 * Export all event data to Excel with multiple sheets
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const { state, eventName, eventDate } = options;
  const { guests, guestGroups, expenses, budgetTotal } = state;
  
  const workbook = XLSX.utils.book_new();
  
  // Build social tree
  const socialTree = buildSocialTree(guests);
  
  // Create group lookup
  const groupById = new Map(guestGroups.map(g => [g.id, g]));
  
  // =========================
  // Sheet 1: Árvore Social
  // =========================
  const treeData = guests.map(guest => {
    const group = groupById.get(guest.groupId);
    const treeNode = socialTree.get(guest.id);
    const priorityLabels: Record<number, string> = {
      1: 'Muito Baixa',
      2: 'Baixa',
      3: 'Média',
      4: 'Alta',
      5: 'Muito Alta',
    };
    
    return {
      'Nome': guest.name,
      'Grupo': group?.name || 'Sem grupo',
      'Grau de Conexão': getLevelLabel(treeNode?.level ?? 0),
      'Cadeia de Conexão': treeNode ? formatConnectionChain(treeNode) : 'Direto',
      'Influência': treeNode?.childCount ?? 0,
      'É Raiz': treeNode?.isRoot ? 'Sim' : 'Não',
      'Confirmado': guest.confirmed ? 'Sim' : 'Não',
      'Prioridade': priorityLabels[guest.priority || 3],
    };
  });
  
  // Sort by tree structure: roots first by influence, then descendants
  treeData.sort((a, b) => {
    // Roots first
    if (a['É Raiz'] === 'Sim' && b['É Raiz'] !== 'Sim') return -1;
    if (a['É Raiz'] !== 'Sim' && b['É Raiz'] === 'Sim') return 1;
    // Then by influence
    if (a['Influência'] !== b['Influência']) return b['Influência'] - a['Influência'];
    // Then by name
    return a['Nome'].localeCompare(b['Nome']);
  });
  
  const treeSheet = XLSX.utils.json_to_sheet(treeData);
  
  // Set column widths
  treeSheet['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 20 }, // Grupo
    { wch: 18 }, // Grau de Conexão
    { wch: 40 }, // Cadeia de Conexão
    { wch: 12 }, // Influência
    { wch: 10 }, // É Raiz
    { wch: 12 }, // Confirmado
    { wch: 15 }, // Prioridade
  ];
  
  XLSX.utils.book_append_sheet(workbook, treeSheet, 'Arvore Social');
  
  // =========================
  // Sheet 2: Influenciadores
  // =========================
  const influencers = Array.from(socialTree.values())
    .filter(node => node.childCount > 0)
    .sort((a, b) => b.childCount - a.childCount)
    .map((node, index) => {
      const group = groupById.get(node.guest.groupId);
      return {
        'Ranking': index + 1,
        'Nome': node.guest.name,
        'Grupo': group?.name || 'Sem grupo',
        'Convidados Trazidos': node.childCount,
        'Confirmado': node.guest.confirmed ? 'Sim' : 'Não',
        'É Raiz': node.isRoot ? 'Sim' : 'Não',
      };
    });
  
  if (influencers.length > 0) {
    const influencerSheet = XLSX.utils.json_to_sheet(influencers);
    influencerSheet['!cols'] = [
      { wch: 10 }, // Ranking
      { wch: 30 }, // Nome
      { wch: 20 }, // Grupo
      { wch: 20 }, // Convidados Trazidos
      { wch: 12 }, // Confirmado
      { wch: 10 }, // É Raiz
    ];
    XLSX.utils.book_append_sheet(workbook, influencerSheet, 'Influenciadores');
  }
  
  // =========================
  // Sheet 3: Convidados (lista simples)
  // =========================
  const guestData = guests.map(guest => {
    const group = groupById.get(guest.groupId);
    const treeNode = socialTree.get(guest.id);
    const priorityLabels: Record<number, string> = {
      1: 'Muito Baixa',
      2: 'Baixa',
      3: 'Média',
      4: 'Alta',
      5: 'Muito Alta',
    };
    
    return {
      'Nome': guest.name,
      'Grupo': group?.name || 'Sem grupo',
      'Confirmado': guest.confirmed ? 'Sim' : 'Não',
      'Prioridade': priorityLabels[guest.priority || 3],
      'Conexão Direta': treeNode?.chain.length === 2 ? treeNode.chain[0] : (treeNode?.isRoot ? '-' : treeNode?.chain[treeNode.chain.length - 2] || '-'),
    };
  });
  
  // Sort by group then name
  guestData.sort((a, b) => {
    const groupCompare = a['Grupo'].localeCompare(b['Grupo']);
    if (groupCompare !== 0) return groupCompare;
    return a['Nome'].localeCompare(b['Nome']);
  });
  
  const guestSheet = XLSX.utils.json_to_sheet(guestData);
  
  // Set column widths
  guestSheet['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 20 }, // Grupo
    { wch: 12 }, // Confirmado
    { wch: 15 }, // Prioridade
    { wch: 30 }, // Conexão
  ];
  
  XLSX.utils.book_append_sheet(workbook, guestSheet, 'Lista Simples');
  
  // =========================
  // Sheet 2: Grupos
  // =========================
  const groupData = guestGroups.map(group => {
    const guestCount = guests.filter(g => g.groupId === group.id).length;
    const confirmedCount = guests.filter(g => g.groupId === group.id && g.confirmed).length;
    
    return {
      'Nome': group.name,
      'Cor': group.color,
      'Total Convidados': guestCount,
      'Confirmados': confirmedCount,
    };
  });
  
  const groupSheet = XLSX.utils.json_to_sheet(groupData);
  groupSheet['!cols'] = [
    { wch: 25 },
    { wch: 10 },
    { wch: 18 },
    { wch: 15 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, groupSheet, 'Grupos');
  
  // =========================
  // Sheet 3: Orçamento
  // =========================
  const expenseData = expenses
    .filter(e => e.include)
    .map(expense => ({
      'Categoria': expense.category,
      'Fornecedor': expense.supplier || '',
      'Valor Previsto': expense.estimatedValue,
      'Valor Contratado': expense.isContracted ? expense.actualValue : '',
      'Status': expense.isContracted ? 'Contratado' : 'Pendente',
    }));
  
  const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
  expenseSheet['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Orçamento');
  
  // =========================
  // Sheet 4: Resumo
  // =========================
  const confirmedGuests = guests.filter(g => g.confirmed).length;
  const totalEstimated = expenses.filter(e => e.include).reduce((sum, e) => sum + e.estimatedValue, 0);
  const totalContracted = expenses.filter(e => e.include && e.isContracted).reduce((sum, e) => sum + e.actualValue, 0);
  const costPerGuest = guests.length > 0 ? totalEstimated / guests.length : 0;
  
  const summaryData = [
    { 'Métrica': 'Nome do Evento', 'Valor': eventName },
    { 'Métrica': 'Data do Evento', 'Valor': eventDate ? new Date(eventDate).toLocaleDateString('pt-BR') : 'Não definida' },
    { 'Métrica': '', 'Valor': '' },
    { 'Métrica': 'Total de Convidados', 'Valor': guests.length },
    { 'Métrica': 'Confirmados', 'Valor': confirmedGuests },
    { 'Métrica': 'Pendentes', 'Valor': guests.length - confirmedGuests },
    { 'Métrica': 'Total de Grupos', 'Valor': guestGroups.length },
    { 'Métrica': '', 'Valor': '' },
    { 'Métrica': 'Orçamento Total', 'Valor': formatCurrency(budgetTotal) },
    { 'Métrica': 'Total Previsto', 'Valor': formatCurrency(totalEstimated) },
    { 'Métrica': 'Total Contratado', 'Valor': formatCurrency(totalContracted) },
    { 'Métrica': 'Saldo Disponível', 'Valor': formatCurrency(budgetTotal - totalContracted) },
    { 'Métrica': 'Custo por Convidado', 'Valor': formatCurrency(costPerGuest) },
  ];
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 25 },
    { wch: 30 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  
  // Save
  const fileName = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// =============================================================================
// PNG EXPORT (Graph Screenshot)
// =============================================================================

interface PNGExportOptions {
  elementId: string;
  eventName: string;
  backgroundColor?: string;
  scale?: number;
}

/**
 * Export the graph visualization as PNG image
 */
export async function exportGraphToPNG(options: PNGExportOptions): Promise<void> {
  const { elementId, eventName, backgroundColor = '#020617', scale = 2 } = options;
  
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }
  
  // Find the SVG inside the element (D3 renders to SVG)
  const svg = element.querySelector('svg');
  if (!svg) {
    throw new Error('No SVG element found in the graph container');
  }
  
  // Capture as PNG
  const dataUrl = await toPng(element, {
    backgroundColor,
    pixelRatio: scale,
    quality: 1,
    // Ensure we capture the full element
    width: element.scrollWidth,
    height: element.scrollHeight,
  });
  
  // Download
  const link = document.createElement('a');
  link.download = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_grafo_${new Date().toISOString().split('T')[0]}.png`;
  link.href = dataUrl;
  link.click();
}

// =============================================================================
// JSON EXPORT (Backup)
// =============================================================================

interface JSONExportOptions {
  state: AppState;
  eventName: string;
}

/**
 * Export event data as JSON backup (can be re-imported)
 */
export async function exportToJSON(options: JSONExportOptions): Promise<void> {
  const { state, eventName } = options;
  
  // Create clean export without internal IDs (more portable)
  const exportData = {
    budgetTotal: state.budgetTotal,
    guestGroups: state.guestGroups.map(g => ({
      name: g.name,
      color: g.color,
    })),
    guests: state.guests.map(g => {
      const group = state.guestGroups.find(gr => gr.id === g.groupId);
      const parent = g.parentId ? state.guests.find(p => p.id === g.parentId) : null;
      return {
        name: g.name,
        groupName: group?.name || '',
        confirmed: g.confirmed,
        parentName: parent?.name || null,
        priority: g.priority || 3,
        photoUrl: g.photoUrl || null,
      };
    }),
    expenses: state.expenses.map(e => ({
      category: e.category,
      supplier: e.supplier,
      estimatedValue: e.estimatedValue,
      actualValue: e.actualValue,
      isContracted: e.isContracted,
      include: e.include,
    })),
    exportedAt: new Date().toISOString(),
  };
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

