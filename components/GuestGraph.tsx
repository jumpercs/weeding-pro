import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Guest, GuestGroup } from '../types';
import { Plus, ListPlus, Palette, Trash2, CheckCircle, Save, X, Edit3 } from 'lucide-react';

interface GuestGraphProps {
  guests: Guest[];
  groups: GuestGroup[];
  onAddGuest: (guest: Guest) => void;
  onUpdateGuest: (guest: Guest) => void;
  onBulkAddGuests: (guests: Guest[]) => void;
  onDeleteGuest: (id: string) => void;
  onToggleConfirm: (id: string) => void;
  onAddGroup: (group: GuestGroup) => void;
  onDeleteGroup: (id: string) => void;
}

// Only Guest Nodes now
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  name: string;
  confirmed: boolean;
  color: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#d946ef', '#f43f5e', '#64748b'
];

export const GuestGraph: React.FC<GuestGraphProps> = ({ 
    guests, 
    groups, 
    onAddGuest, 
    onUpdateGuest,
    onBulkAddGuests,
    onDeleteGuest, 
    onToggleConfirm,
    onAddGroup,
    onDeleteGroup
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [sidebarTab, setSidebarTab] = useState<'add' | 'bulk' | 'groups' | 'edit'>('add');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Input State
  const [newGuestName, setNewGuestName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.name || 'Família');
  
  // Bulk Input State
  const [bulkText, setBulkText] = useState('');

  // Group Input State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);

  // Edit State
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');

  // Derived state for the selected guest object
  const selectedGuest = useMemo(() => 
    guests.find(g => g.id === selectedNodeId), 
  [guests, selectedNodeId]);

  // Update Edit form when selection changes
  useEffect(() => {
      if (selectedGuest) {
          setEditName(selectedGuest.name);
          setEditGroup(selectedGuest.group);
          setSidebarTab('edit');
      } else if (sidebarTab === 'edit') {
          setSidebarTab('add');
      }
  }, [selectedGuest]); // Depend only on selectedGuest to prevent loops

  // Update selected group if groups change and current is invalid
  useEffect(() => {
      if (groups.length > 0 && !groups.find(g => g.name === selectedGroup)) {
          setSelectedGroup(groups[0].name);
      }
  }, [groups, selectedGroup]);

  // Prepare Data for D3
  const nodes: GraphNode[] = useMemo(() => {
    // Helper to get color
    const getColor = (groupName: string) => groups.find(g => g.name === groupName)?.color || '#94a3b8';

    return guests.map(g => ({
      id: g.id,
      group: g.group,
      name: g.name,
      confirmed: g.confirmed,
      color: getColor(g.group),
      // We don't map fx/fy from state to allow re-simulation, unless we want to save position
    }));
  }, [guests, groups]);

  // Calculate Group Centers for Clustering
  const groupCenters = useMemo(() => {
      const centers: Record<string, {x: number, y: number}> = {};
      const numGroups = groups.length;
      if (numGroups === 0) return centers;
      
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;
      const radius = Math.min(width, height) / 3;

      groups.forEach((g, i) => {
          const angle = (i / numGroups) * 2 * Math.PI;
          centers[g.name] = {
              x: width / 2 + Math.cos(angle) * radius,
              y: height / 2 + Math.sin(angle) * radius
          };
      });
      return centers;
  }, [groups, containerRef.current?.clientWidth, containerRef.current?.clientHeight]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);

    // Forces
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("charge", d3.forceManyBody().strength(-20)) // Slight repulsion to prevent exact overlap
      .force("collide", d3.forceCollide().radius(12).strength(0.7)) // Prevent collision
      // Custom clustering force
      .force("cluster", (alpha) => {
          for (const node of nodes) {
            const center = groupCenters[node.group] || { x: width / 2, y: height / 2 };
            // Move node towards its group center
            const k = alpha * 0.1; // Strength
            node.vx! += (center.x - node.x!) * k;
            node.vy! += (center.y - node.y!) * k;
          }
      });

    // Draw Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      )
      .on("click", (event, d) => {
          event.stopPropagation(); // Prevent bg click
          setSelectedNodeId(d.id);
      });

    // Background circle (Halo) for selected node
    node.filter(d => d.id === selectedNodeId)
        .append("circle")
        .attr("r", 14)
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3,3");

    // Main Circle
    node.append("circle")
      .attr("r", 8)
      .attr("fill", d => d.color)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2)
      .attr("opacity", d => d.confirmed ? 1 : 0.6)
      .style("cursor", "pointer");

    // Labels
    node.append("text")
      .text(d => d.name)
      .attr("x", 12)
      .attr("y", 4)
      .attr("fill", "#e2e8f0")
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .style("text-shadow", "0px 1px 2px #000");

    simulation.on("tick", () => {
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Background click to deselect
    svg.on("click", () => {
        setSelectedNodeId(null);
        setSidebarTab('add');
    });

    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, groupCenters, selectedNodeId]); // Re-run when selection or structure changes

  // Handlers
  const handleAdd = () => {
      if (!newGuestName.trim()) return;
      onAddGuest({
          id: Date.now().toString(),
          name: newGuestName,
          group: selectedGroup,
          confirmed: false
      });
      setNewGuestName('');
  };

  const handleBulkAdd = () => {
      if (!bulkText.trim()) return;
      const names = bulkText.split('\n').filter(n => n.trim().length > 0);
      const newGuests = names.map((name, idx) => ({
          id: `${Date.now()}-${idx}`,
          name: name.trim(),
          group: selectedGroup,
          confirmed: false
      }));
      onBulkAddGuests(newGuests);
      setBulkText('');
      setSidebarTab('add');
  };

  const handleCreateGroup = () => {
      if (!newGroupName.trim()) return;
      onAddGroup({
          id: Date.now().toString(),
          name: newGroupName,
          color: newGroupColor
      });
      setNewGroupName('');
  };

  const handleUpdateGuest = () => {
      if (!selectedGuest || !editName.trim()) return;
      onUpdateGuest({
          ...selectedGuest,
          name: editName,
          group: editGroup
      });
  };

  return (
    <div className="flex h-full bg-slate-900 border-t border-slate-700">
        
        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col shadow-xl z-10 shrink-0">
            
            {/* Sidebar Tabs */}
            <div className="flex border-b border-slate-700">
                {sidebarTab === 'edit' ? (
                     <div className="flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 bg-slate-700 text-teal-400 border-b-2 border-teal-400">
                        <Edit3 size={14} /> Editar Convidado
                     </div>
                ) : (
                    <>
                        <button 
                            onClick={() => setSidebarTab('add')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-colors ${sidebarTab === 'add' ? 'bg-slate-700 text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Plus size={14}/> Add
                        </button>
                        <button 
                            onClick={() => setSidebarTab('bulk')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-colors ${sidebarTab === 'bulk' ? 'bg-slate-700 text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <ListPlus size={14}/> Multi
                        </button>
                        <button 
                            onClick={() => setSidebarTab('groups')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 transition-colors ${sidebarTab === 'groups' ? 'bg-slate-700 text-teal-400 border-b-2 border-teal-400' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Palette size={14}/> Grupos
                        </button>
                    </>
                )}
            </div>

            <div className="p-4 border-b border-slate-700 bg-slate-700/30">
                {/* Content based on Tab */}
                {sidebarTab === 'add' && (
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="Nome do convidado" 
                            className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white focus:border-teal-500 outline-none text-sm"
                            value={newGuestName}
                            onChange={(e) => setNewGuestName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                         <div className="flex gap-2">
                             <select 
                                className="flex-1 p-2 rounded bg-slate-900 border border-slate-600 text-white focus:border-teal-500 outline-none text-sm"
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                             >
                                 {groups.map(g => (
                                     <option key={g.id} value={g.name}>{g.name}</option>
                                 ))}
                             </select>
                             <button 
                                onClick={handleAdd}
                                className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded transition-colors"
                             >
                                 <Plus size={20} />
                             </button>
                         </div>
                    </div>
                )}

                {sidebarTab === 'bulk' && (
                    <div className="space-y-3">
                        <textarea 
                            placeholder="Cole a lista de nomes aqui (um por linha)..." 
                            className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white focus:border-teal-500 outline-none text-sm h-32 resize-none"
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                        />
                         <div className="flex gap-2">
                             <select 
                                className="flex-1 p-2 rounded bg-slate-900 border border-slate-600 text-white focus:border-teal-500 outline-none text-sm"
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                             >
                                 {groups.map(g => (
                                     <option key={g.id} value={g.name}>{g.name}</option>
                                 ))}
                             </select>
                             <button 
                                onClick={handleBulkAdd}
                                className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                             >
                                 Adicionar
                             </button>
                         </div>
                    </div>
                )}

                {sidebarTab === 'groups' && (
                    <div className="space-y-3">
                        <div className="flex gap-2 items-center">
                            <input 
                                type="text" 
                                placeholder="Novo Grupo" 
                                className="flex-1 p-2 rounded bg-slate-900 border border-slate-600 text-white focus:border-teal-500 outline-none text-sm"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                            <button 
                                onClick={handleCreateGroup}
                                className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 bg-slate-800 rounded border border-slate-600">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setNewGroupColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 ${newGroupColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 mt-2">
                            {groups.map(g => (
                                <div key={g.id} className="flex justify-between items-center text-sm p-1 hover:bg-slate-700/50 rounded">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: g.color}}></div>
                                        <span>{g.name}</span>
                                    </div>
                                    <button onClick={() => onDeleteGroup(g.id)} className="text-slate-500 hover:text-rose-500">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {sidebarTab === 'edit' && selectedGuest && (
                     <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Nome</label>
                            <input 
                                type="text" 
                                className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white focus:border-teal-500 outline-none text-sm"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Grupo / Categoria</label>
                            <select 
                                className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white focus:border-teal-500 outline-none text-sm"
                                value={editGroup}
                                onChange={(e) => setEditGroup(e.target.value)}
                            >
                                {groups.map(g => (
                                    <option key={g.id} value={g.name}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                             <button 
                                onClick={() => onToggleConfirm(selectedGuest.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm border ${selectedGuest.confirmed ? 'bg-teal-900/30 border-teal-500 text-teal-400' : 'border-slate-600 text-slate-400'}`}
                            >
                                {selectedGuest.confirmed ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-500"></div>}
                                {selectedGuest.confirmed ? 'Confirmado' : 'Pendente'}
                            </button>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-700">
                            <button 
                                onClick={handleUpdateGuest}
                                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                <Save size={16} /> Salvar
                            </button>
                             <button 
                                onClick={() => {
                                    setSelectedNodeId(null);
                                    setSidebarTab('add');
                                }}
                                className="px-3 py-2 rounded text-sm font-medium transition-colors text-slate-400 hover:bg-slate-700"
                            >
                                Cancelar
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                onDeleteGuest(selectedGuest.id);
                                setSelectedNodeId(null);
                                setSidebarTab('add');
                            }}
                            className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 px-3 py-2 rounded text-sm font-medium transition-colors flex justify-center items-center gap-2 mt-2"
                        >
                            <Trash2 size={16} /> Excluir Convidado
                        </button>
                     </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto flex flex-col">
                <div className="p-3 bg-slate-800 sticky top-0 border-b border-slate-700 flex justify-between items-center z-10">
                     <span className="text-xs font-bold uppercase text-slate-400">Total ({guests.length})</span>
                     <div className="text-xs text-slate-500 flex gap-2">
                         <span className="text-teal-400">{guests.filter(g => g.confirmed).length} OK</span>
                         <span>{guests.filter(g => !g.confirmed).length} Pend</span>
                     </div>
                </div>
                <div className="p-2 space-y-1">
                    {guests.map(g => (
                        <div 
                            key={g.id} 
                            className={`p-2 rounded flex justify-between items-center group cursor-pointer border-l-4 transition-all ${selectedNodeId === g.id ? 'bg-slate-700 border-white' : 'bg-transparent hover:bg-slate-700/50'}`}
                            style={{ borderLeftColor: selectedNodeId === g.id ? 'white' : (groups.find(grp => grp.name === g.group)?.color || '#64748b') }}
                            onClick={() => setSelectedNodeId(g.id)}
                        >
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-200">{g.name}</span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500" style={{color: groups.find(grp => grp.name === g.group)?.color}}>{g.group}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`${g.confirmed ? "text-teal-400" : "text-slate-600"}`}>
                                    {g.confirmed ? <CheckCircle size={14} /> : <div className="w-3 h-3 rounded-full border border-slate-600"></div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Graph Area */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden" ref={containerRef}>
            <div className="absolute top-4 left-4 z-0 pointer-events-none opacity-50">
                <div className="flex gap-4 mt-2">
                     <p className="text-xs text-slate-400">Clique para editar • Arraste para organizar</p>
                </div>
            </div>
            
            {/* Legend Overlay */}
            <div className="absolute bottom-4 right-4 bg-slate-800/80 p-3 rounded border border-slate-700 backdrop-blur-sm pointer-events-none">
                <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Legenda</h5>
                <div className="flex flex-col gap-1">
                     {groups.map(g => (
                         <div key={g.id} className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full" style={{backgroundColor: g.color}}></div>
                             <span className="text-xs text-slate-300">{g.name}</span>
                         </div>
                     ))}
                </div>
            </div>

            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
        </div>
    </div>
  );
};