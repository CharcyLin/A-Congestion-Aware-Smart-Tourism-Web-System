import React, { useState } from 'react';
import { 
  Activity, 
  ArrowUpDown, 
  Search, 
  X, 
  MapPin, 
  Navigation, 
  Circle, 
  Plus, 
  Star, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { MACAU_POIS, POI_BASE_CROWD } from '../constants';
import { getLocalizedAddress, getLocalizedTag } from '../utils/translateHelper';

interface CrowdContentProps {
  t: (key: any) => string;
  lang: string;
  translations: any;
  crowdAttractions: any[];
  filteredAttractions: any[];
  crowdStats: { crowded: number; moderate: number; comfortable: number };
  sortOrder: 'asc' | 'desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  crowdSearchQuery: string;
  setCrowdSearchQuery: (query: string) => void;
  selectedRegionFilter: string;
  setSelectedRegionFilter: (region: any) => void;
  selectedCrowdSpotId: string | null;
  setSelectedCrowdSpotId: (id: string | null) => void;
  onSelectSpot?: (id: string) => void;
  onSetStart?: (id: string) => void;
  onAddDest?: (id: string) => void;
  time?: number;
  setTime?: (time: number) => void;
  getLiveBeijingTime?: () => { timeStr: string; hour: number; minute: number };
  onClose?: () => void;
}

export const CrowdContent: React.FC<CrowdContentProps> = ({
  t,
  lang,
  translations,
  crowdAttractions,
  filteredAttractions,
  crowdStats,
  sortOrder,
  setSortOrder,
  crowdSearchQuery,
  setCrowdSearchQuery,
  selectedRegionFilter,
  setSelectedRegionFilter,
  selectedCrowdSpotId,
  setSelectedCrowdSpotId,
  onSelectSpot,
  onSetStart,
  onAddDest,
  time = 12,
  setTime,
  getLiveBeijingTime,
  onClose
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'crowded' | 'moderate' | 'comfortable'>('all');
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>(null);

  const [timeInputStr, setTimeInputStr] = useState<string>(() => {
    const displayHour = Math.floor(time);
    const displayMinute = Math.round((time - displayHour) * 60);
    return `${String(displayHour).padStart(2, '0')}:${String(displayMinute).padStart(2, '0')}`;
  });

  React.useEffect(() => {
    const displayHour = Math.floor(time);
    const displayMinute = Math.round((time - displayHour) * 60);
    setTimeInputStr(`${String(displayHour).padStart(2, '0')}:${String(displayMinute).padStart(2, '0')}`);
  }, [time]);

  // Apply status filter on top of region/search
  const displayedAttractions = filteredAttractions.filter(attr => {
    if (selectedStatusFilter !== 'all') {
      return attr.statusKey === selectedStatusFilter;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Top Header & Interactive Filter Bar */}
      <div className="p-3.5 border-b border-gray-100 bg-white space-y-2.5 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Activity size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-bold text-gray-900 truncate">
                  {t('attraction_crowd')}
                </h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 transition-colors shadow-2xs cursor-pointer"
              title={sortOrder === 'desc' ? (t('sort_by_crowd') || '拥挤优先') : (t('sort_by_comfort') || '舒适优先')}
            >
              <ArrowUpDown size={15} className="text-indigo-600" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors ml-1"
                title={t('close') || "关闭看板返回地图"}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Time Selector Bar (Allows checking any hour from 0:00 to 24:00) */}
        {setTime && (
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <Clock size={14} className="text-indigo-600" />
              <input
                type="text"
                value={timeInputStr}
                onChange={(e) => {
                  const val = e.target.value;
                  setTimeInputStr(val);
                  if (val.includes(':')) {
                    const [h, m] = val.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 24 && m >= 0 && m < 60) {
                      setTime(h + m / 60);
                    }
                  } else if (val.length === 4 && !isNaN(Number(val))) {
                    const h = Number(val.slice(0, 2));
                    const m = Number(val.slice(2, 4));
                    if (h >= 0 && h <= 24 && m >= 0 && m < 60) {
                      setTime(h + m / 60);
                    }
                  }
                }}
                onBlur={() => {
                  const [h, m] = timeInputStr.split(':').map(Number);
                  if (!isNaN(h) && !isNaN(m)) {
                    const validH = Math.min(24, Math.max(0, h));
                    const validM = Math.min(59, Math.max(0, m));
                    setTime(validH + validM / 60);
                    setTimeInputStr(`${String(validH).padStart(2, '0')}:${String(validM).padStart(2, '0')}`);
                  }
                }}
                placeholder="21:00"
                className="font-mono font-extrabold text-sm text-indigo-700 bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-indigo-200 outline-none w-[72px] text-center"
              />
            </div>

            <div className="flex-1 flex items-center gap-2 max-w-xs">
              <input
                type="range"
                min="0"
                max="24"
                value={Math.round(time)}
                onChange={(e) => setTime(Number(e.target.value))}
                className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {getLiveBeijingTime && (
              <button
                onClick={() => {
                  const live = getLiveBeijingTime();
                  setTime(live.hour + live.minute / 60);
                }}
                className="px-2 py-1 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs"
              >
                <RotateCcw size={10} />
                <span>{t('live_badge') || '实时'}</span>
              </button>
            )}
          </div>
        )}

        {/* Clickable Status Filter Cards (Image 3 / Google Maps Style) */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setSelectedStatusFilter('all')}
            className={`p-1.5 rounded-xl text-center border transition-all ${
              selectedStatusFilter === 'all'
                ? 'bg-gray-900 text-white border-gray-900 shadow-xs font-bold'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="text-[10px] opacity-80">{t('filter_all') || '全部'}</div>
            <div className="text-xs font-extrabold">{crowdAttractions.length}</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'comfortable' ? 'all' : 'comfortable')}
            className={`p-1.5 rounded-xl text-center border transition-all ${
              selectedStatusFilter === 'comfortable'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <div className="text-[10px] font-medium flex items-center justify-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{t('comfortable')}</span>
            </div>
            <div className="text-xs font-extrabold text-emerald-700">{crowdStats.comfortable}</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'moderate' ? 'all' : 'moderate')}
            className={`p-1.5 rounded-xl text-center border transition-all ${
              selectedStatusFilter === 'moderate'
                ? 'bg-yellow-500 text-white border-yellow-500 shadow-xs font-bold'
                : 'bg-yellow-50/90 border-yellow-200 text-yellow-800 hover:bg-yellow-100'
            }`}
          >
            <div className="text-[10px] font-medium flex items-center justify-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span>{t('moderate')}</span>
            </div>
            <div className="text-xs font-extrabold text-yellow-700">{crowdStats.moderate}</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'crowded' ? 'all' : 'crowded')}
            className={`p-1.5 rounded-xl text-center border transition-all ${
              selectedStatusFilter === 'crowded'
                ? 'bg-red-600 text-white border-red-600 shadow-xs font-bold'
                : 'bg-red-50/90 border-red-200 text-red-800 hover:bg-red-100'
            }`}
          >
            <div className="text-[10px] font-medium flex items-center justify-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>{t('crowded')}</span>
            </div>
            <div className="text-xs font-extrabold text-red-700">{crowdStats.crowded}</div>
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={crowdSearchQuery}
            onChange={(e) => setCrowdSearchQuery(e.target.value)}
            placeholder={t('search_spots_placeholder')}
            className="w-full pl-8.5 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-indigo-400 transition-all"
          />
          {crowdSearchQuery && (
            <button
              onClick={() => setCrowdSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Region Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {[
            { key: 'all', label: 'All', nameKey: 'region_all', count: crowdAttractions.length },
            { key: 'macau_peninsula', label: 'Macau Peninsula', nameKey: 'region_macau_peninsula', count: crowdAttractions.filter(a => a.regionKey === 'macau_peninsula').length },
            { key: 'cotai', label: 'Cotai Strip', nameKey: 'region_cotai', count: crowdAttractions.filter(a => a.regionKey === 'cotai').length },
            { key: 'taipa', label: 'Taipa', nameKey: 'region_taipa', count: crowdAttractions.filter(a => a.regionKey === 'taipa').length },
            { key: 'coloane', label: 'Coloane', nameKey: 'region_coloane', count: crowdAttractions.filter(a => a.regionKey === 'coloane').length },
            { key: 'port', label: 'Ports & Transport', nameKey: 'region_port', count: crowdAttractions.filter(a => a.category === 'port').length },
          ].map(tab => {
            const localizedRegionName = t(tab.nameKey as any) || tab.label;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedRegionFilter(tab.key as any)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-semibold shrink-0 cursor-pointer ${
                  selectedRegionFilter === tab.key
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                }`}
              >
                {localizedRegionName} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Scrollable Spots List with Rich Interactive Cards */}
      <div className="overflow-y-auto p-3 space-y-2.5 flex-1 bg-gray-50/50">
        {displayedAttractions.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
            <Search size={24} className="mx-auto text-gray-300 mb-2" />
            <div className="text-xs font-semibold text-gray-600">{t('no_spots_found')}</div>
            <button
              onClick={() => {
                setCrowdSearchQuery('');
                setSelectedRegionFilter('all');
                setSelectedStatusFilter('all');
              }}
              className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              {t('clear_search')}
            </button>
          </div>
        ) : (
          displayedAttractions.map((attr) => {
            const isSelected = selectedCrowdSpotId === attr.id;
            const isExpanded = expandedSpotId === attr.id;
            const poiData = MACAU_POIS.find(p => p.id === attr.id);
            const rating = poiData?.rating || 4.7;
            const reviewCount = poiData?.reviewCount || 1200;
            const rawAddress = poiData?.address || attr.region;
            const rawTag = poiData?.tag || attr.region;
            const address = getLocalizedAddress(rawAddress, lang);
            const tag = getLocalizedTag(rawTag, lang);
            const peakHourInfo = POI_BASE_CROWD[attr.id] || { peakHour: 15 };

            return (
              <div 
                key={attr.id} 
                onClick={() => {
                  setSelectedCrowdSpotId(attr.id);
                  if (onSelectSpot) {
                    onSelectSpot(attr.id);
                  }
                }}
                className={`p-3.5 bg-white rounded-2xl border transition-all select-none shadow-2xs space-y-2.5 ${
                  isSelected 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-sm' 
                    : 'border-gray-200/90 hover:border-indigo-200'
                }`}
              >
                {/* Main Card Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm truncate" title={attr.name}>
                        {attr.name}
                      </span>
                      {tag && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                          {tag}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1 truncate">
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {rating}
                      </span>
                    </div>
                  </div>

                  {/* Crowd Level Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <span 
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1"
                      style={{
                        color: attr.colorHex,
                        backgroundColor: attr.statusBg,
                        borderColor: `${attr.colorHex}40`
                      }}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: attr.colorHex }}
                      />
                      {attr.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                      ~{attr.predictedVisitors.toLocaleString()}{t('visitors_in_park') || ' 人在园'}
                    </span>
                  </div>
                </div>

                {/* Real-time Crowd Progress Bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${attr.crowdLevel}%`,
                      backgroundColor: attr.colorHex
                    }}
                  />
                </div>

                {/* 24-Hour Crowd Preview Curve if expanded */}
                {isExpanded && (
                  <div className="p-2.5 bg-gray-50 rounded-xl space-y-2 text-xs border border-gray-100 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-gray-600 font-medium">
                      <span>{t('hourly_distribution_label') || '24小时客流分布规律:'}</span>
                    </div>

                    {/* Hourly mini bars */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-0.5 items-end h-10 pt-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(h => {
                          const isCurrentH = h === Math.floor(time);
                          const dist = Math.abs(h - peakHourInfo.peakHour);
                          const hCrowd = Math.max(15, Math.round(90 * Math.exp(-(dist * dist) / 16)));
                          return (
                            <div key={h} className="flex-1 flex flex-col items-center h-full justify-end">
                              <div 
                                className={`w-full rounded-t transition-all ${
                                  isCurrentH ? 'bg-indigo-600 ring-1 ring-indigo-700' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                style={{ height: `${hCrowd}%` }}
                                title={`${h}:00 - ${t('hourly_tooltip').replace('{crowd}', String(hCrowd)) || `预计拥挤度约 ${hCrowd}%`}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 px-0.5">
                        {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                          <span key={h}>{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons: 设为起点, 加入路线, 定位, 详情展开 */}
                <div 
                  className="flex items-center gap-1.5 pt-1 border-t border-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onSetStart && (
                    <button
                      onClick={() => onSetStart(attr.id)}
                      className="flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap truncate"
                    >
                      <Circle size={9} className="fill-blue-600 text-blue-600 shrink-0" />
                      <span className="truncate">{t('set_as_start') || '设起点'}</span>
                    </button>
                  )}

                  {onAddDest && (
                    <button
                      onClick={() => onAddDest(attr.id)}
                      className="flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer whitespace-nowrap truncate"
                    >
                      <Plus size={12} className="shrink-0" />
                      <span className="truncate">{t('add_as_dest') || '加路线'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedCrowdSpotId(attr.id);
                      if (onSelectSpot) onSelectSpot(attr.id);
                    }}
                    className="p-1.5 rounded-xl text-gray-600 hover:bg-gray-100 border border-gray-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title={t('locate_on_map') || '在地图上定位'}
                  >
                    <MapPin size={13} className="text-indigo-600" />
                    <span>{t('locate_on_map') || '定位'}</span>
                  </button>

                  <button
                    onClick={() => setExpandedSpotId(isExpanded ? null : attr.id)}
                    className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 text-xs transition-colors"
                    title={isExpanded ? (t('collapse') || "收起走势") : (t('expand') || "展开客流时段走势")}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
