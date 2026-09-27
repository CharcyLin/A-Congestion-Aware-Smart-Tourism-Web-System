import React, { useState } from 'react';
import { 
  History, 
  X, 
  Clock, 
  Calendar, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Sparkles, 
  Trash2, 
  Navigation, 
  Star, 
  Check, 
  Car, 
  Bus, 
  Footprints, 
  Bike 
} from 'lucide-react';
import { MACAU_POIS } from '../constants';

export interface RouteHistoryItem {
  id: string;
  title: string;
  createdAt: string; // 格式："年/月/日 24h制时间"，例如 "2026/09/23 14:30"
  timestamp: number;
  spotCount: number; // 经停景点数量
  destinationsCount: number;
  totalStopsCount: number;
  transportMode: 'car' | 'transit' | 'walk' | 'bike';
  waypoints: any[];
  waypointDurations: Record<string, number>;
  summaryText?: string;
}

interface RouteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: RouteHistoryItem[];
  onSelectAndEdit: (item: RouteHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onSaveCurrentToHistory?: () => void;
  onSaveCurrentRoute?: () => void;
  lang: 'en' | 'zh-CN' | 'zh-TW' | 'pt';
  t?: (key: any) => string;
}

export const RouteHistoryModal: React.FC<RouteHistoryModalProps> = ({
  isOpen,
  onClose,
  historyList,
  onSelectAndEdit,
  onDeleteHistory,
  onSaveCurrentToHistory,
  onSaveCurrentRoute,
  lang,
  t = (k: any) => String(k || '')
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = onSaveCurrentToHistory || onSaveCurrentRoute;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const modeIcon = (mode: string) => {
    switch (mode) {
      case 'car': return <Car size={13} className="text-blue-500" />;
      case 'walk': return <Footprints size={13} className="text-emerald-500" />;
      case 'bike': return <Bike size={13} className="text-amber-500" />;
      default: return <Bus size={13} className="text-indigo-500" />;
    }
  };

  const modeLabel = (mode: string) => {
    switch (mode) {
      case 'car': return t('mode_car') || '驾车';
      case 'walk': return t('mode_walk') || '步行';
      case 'bike': return t('mode_bike') || '骑行';
      default: return t('mode_transit') || '公交';
    }
  };

  const getLocalizedTitle = (item: RouteHistoryItem) => {
    if (item.id === 'hist_1' || item.id === 'hist_2' || item.id === 'hist_3') {
      return t(item.id as any);
    }
    if (item.title.endsWith('避峰优化定制路线') || item.title.includes('Optimized Custom Route') || item.title.includes('定制路线')) {
      const firstDest = item.waypoints.find(w => w.type === 'dest') || item.waypoints[0];
      const localizedFirstDest = firstDest ? (firstDest.nameKey ? t(firstDest.nameKey) : (firstDest.customName || firstDest.name)) : '';
      return `${localizedFirstDest}${t('custom_route_suffix')}`;
    }
    return item.title;
  };

  return (
    <div 
      className="fixed inset-0 z-[2500] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <History size={16} />
            </div>
            <h3 className="font-extrabold text-base text-gray-900 tracking-tight">
              {t('history') || '历史规划记录'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title={lang === 'en' ? 'Close' : lang === 'pt' ? 'Fechar' : '关闭'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar: Save current route to history */}
        <div className="px-4 py-2 bg-slate-50/80 border-b border-gray-100 flex items-center justify-between gap-2 text-xs shrink-0 whitespace-nowrap overflow-hidden">
          <span className="text-gray-500 font-medium text-[11px] whitespace-nowrap">
            {lang === 'en' ? (
              <>Total <strong className="text-indigo-600 font-bold">{historyList.length}</strong> records</>
            ) : lang === 'pt' ? (
              <>Total: <strong className="text-indigo-600 font-bold">{historyList.length}</strong></>
            ) : (
              <>共 <strong className="text-indigo-600 font-bold">{historyList.length}</strong> 条记录</>
            )}
          </span>
          {handleSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold shadow-2xs transition-all active:scale-95 cursor-pointer text-[11px] whitespace-nowrap shrink-0"
              title={t('save_to_history') || '保存当前规划至历史'}
            >
              <Star size={13} className="text-amber-500 fill-amber-500" />
              <span>{lang === 'en' ? 'Save Route' : lang === 'pt' ? 'Salvar Rota' : '保存路线'}</span>
            </button>
          )}
        </div>

        {/* List of History Items */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {historyList.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <History size={36} className="mx-auto mb-3 text-gray-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-gray-600">
                {lang === 'en' ? 'No history route records yet' : lang === 'pt' ? 'Nenhum registro de rota histórico ainda' : '暂无历史路线规划记录'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {lang === 'en' ? 'Click "Save Route" above to save your current route' : lang === 'pt' ? 'Clique em "Salvar Rota" acima para salvar sua rota atual' : '点击上方「保存路线」即可保存当前路线'}
              </p>
            </div>
          ) : (
            historyList.map((item) => {
              const isExpanded = expandedId === item.id;

              return (
                <div 
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:border-indigo-300 transition-all overflow-hidden"
                >
                  {/* Summary Header of Card */}
                  <div 
                    onClick={() => toggleExpand(item.id)}
                    className="p-3.5 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Title & Mode */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 tracking-tight">
                            {getLocalizedTitle(item)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {modeIcon(item.transportMode)}
                            <span>{modeLabel(item.transportMode)}</span>
                          </span>
                        </div>

                        {/* Creation Time & Attractions Count Badges */}
                        <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                          <div className="flex items-center gap-1 text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md font-mono text-[11px]">
                            <Clock size={11} className="text-gray-400 shrink-0" />
                            <span className="text-gray-400">{lang === 'en' ? 'Time: ' : lang === 'pt' ? 'Hora: ' : '时间：'}</span>
                            <span className="font-semibold text-gray-700">{item.createdAt}</span>
                          </div>

                          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-100/90">
                            <MapPin size={11} className="shrink-0 text-emerald-600" />
                            <span>{t('total_prefix')}{item.totalStopsCount}{t('stations_unit')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions: Delete & Chevron */}
                      <div className="flex items-center gap-1 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onDeleteHistory(item.id)}
                          className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={lang === 'en' ? 'Delete record' : lang === 'pt' ? 'Excluir registro' : '删除该记录'}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title={isExpanded ? (lang === 'en' ? 'Collapse' : lang === 'pt' ? 'Recolher' : '收起详情') : (lang === 'en' ? 'Expand' : lang === 'pt' ? 'Expandir' : '展开详情')}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Attractions List Details */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-gray-100 bg-slate-50/50 animate-in fade-in duration-150">
                      <div className="text-[11px] font-bold text-gray-700 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                        {lang === 'en' ? 'Route details (by visit order):' : lang === 'pt' ? 'Detalhes da rota (por ordem de visita):' : '途经全部景点详情（按游览次序）：'}
                      </div>

                      <div className="space-y-1.5">
                        {item.waypoints.map((wp, idx) => {
                          const isStart = wp.type === 'start';
                          const displayName = wp.nameKey ? t(wp.nameKey as any) : (wp.customName || wp.name || t('destination_point') || '经停站点');
                          const duration = wp.durationMinutes || item.waypointDurations[wp.id] || 60;

                          return (
                            <div 
                              key={wp.id || idx}
                              className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-gray-200/80 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                  isStart ? 'bg-indigo-600' : 'bg-emerald-600'
                                }`}>
                                  {isStart ? (lang === 'en' || lang === 'pt' ? 'S' : '起') : idx}
                                </span>
                                <span className="font-semibold text-gray-800 truncate">
                                  {displayName}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 text-gray-400 text-[11px]">
                                {isStart ? (
                                  <span className="text-indigo-600 font-medium">{t('start_point')}</span>
                                ) : (
                                  <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {lang === 'en' || lang === 'pt' ? `Visit ${duration} min` : `游览 ${duration} 分钟`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Card Action: Edit & Re-optimize Button */}
                      <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectAndEdit(item)}
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <Sparkles size={13} />
                          <span>{lang === 'en' ? 'Smart Re-Plan Route' : lang === 'pt' ? 'Replanejar Inteligente' : '在避峰规划界面重新智能规划'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Bottom Bar if not expanded */}
                  {!isExpanded && (
                    <div className="px-3.5 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{lang === 'en' ? 'View Details' : lang === 'pt' ? 'Ver Detalhes' : '查看景点详情'}</span>
                        <ChevronDown size={13} />
                      </button>

                      <button
                        onClick={() => onSelectAndEdit(item)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <Edit3 size={11} />
                        <span>{t('edit') || '重新规划'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
