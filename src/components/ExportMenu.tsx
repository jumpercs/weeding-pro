import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table, Image, Loader2, ChevronDown, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportGuestsToPDF, exportToExcel, exportGraphToPNG, exportToJSON, canExport } from '../lib/export';
import type { AppState } from '../types';

interface ExportMenuProps {
  state: AppState;
  eventName: string;
  eventDate?: string | null;
  graphElementId?: string;
  plan?: string;
}

type ExportType = 'pdf' | 'excel' | 'png' | 'json';

export const ExportMenu: React.FC<ExportMenuProps> = ({
  state,
  eventName,
  eventDate,
  graphElementId = 'guest-graph-container',
  plan = 'free',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<ExportType | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = async (type: ExportType) => {
    // Check access
    if (!canExport(plan)) {
      toast.error('Faça upgrade para exportar seus dados');
      setIsOpen(false);
      return;
    }

    setLoading(type);

    try {
      switch (type) {
        case 'pdf':
          await exportGuestsToPDF({
            guests: state.guests,
            groups: state.guestGroups,
            eventName,
            eventDate,
          });
          toast.success('PDF exportado com sucesso!');
          break;

        case 'excel':
          await exportToExcel({
            state,
            eventName,
            eventDate,
          });
          toast.success('Excel exportado com sucesso!');
          break;

        case 'png':
          await exportGraphToPNG({
            elementId: graphElementId,
            eventName,
          });
          toast.success('Imagem do grafo exportada!');
          break;

        case 'json':
          await exportToJSON({
            state,
            eventName,
          });
          toast.success('Backup JSON exportado!');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao exportar: ${message}`);
    } finally {
      setLoading(null);
      setIsOpen(false);
    }
  };

  const exportOptions = [
    {
      type: 'pdf' as ExportType,
      label: 'Lista de Convidados (PDF)',
      description: 'Tabela formatada para impressão',
      icon: FileText,
    },
    {
      type: 'excel' as ExportType,
      label: 'Planilha Completa (Excel)',
      description: 'Convidados, grupos e orçamento',
      icon: Table,
    },
    {
      type: 'png' as ExportType,
      label: 'Imagem do Grafo (PNG)',
      description: 'Screenshot da visualização',
      icon: Image,
    },
    {
      type: 'json' as ExportType,
      label: 'Backup (JSON)',
      description: 'Para importar depois',
      icon: FileJson,
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-900/50 hover:border-teal-500/50 px-3 py-2 rounded transition-all shadow-sm"
      >
        <Download size={16} />
        Exportar
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Exportar Dados</p>
          </div>

          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isLoading = loading === option.type;

            return (
              <button
                key={option.type}
                onClick={() => handleExport(option.type)}
                disabled={loading !== null}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="mt-0.5">
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-teal-400" />
                  ) : (
                    <Icon size={18} className="text-slate-400" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">{option.label}</p>
                  <p className="text-xs text-slate-500">{option.description}</p>
                </div>
              </button>
            );
          })}

          <div className="px-3 py-2 border-t border-slate-700 mt-1">
            <p className="text-xs text-slate-500">
              {state.guests.length} convidados • {state.guestGroups.length} grupos
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

