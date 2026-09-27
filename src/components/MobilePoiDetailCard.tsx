import React, { useState } from 'react';
import { X, Star, MapPin, Circle, Plus, ChevronDown, ChevronUp, Check, Navigation, TrendingUp } from 'lucide-react';
import { MACAU_POIS } from '../constants';
import { getLocalizedAddress, getLocalizedTag } from '../utils/translateHelper';

interface MobilePoiDetailCardProps {
  spotId: string | null;
  onClose: () => void;
  crowdAttractions: any[];
  onSetStart: (id: string) => void;
  onAddDest: (id: string) => void;
  onLocateSpot?: (id: string) => void;
  t: (key: any) => string;
  lang?: string;
  isDesktop?: boolean;
}

export const MobilePoiDetailCard: React.FC<MobilePoiDetailCardProps> = ({
  spotId,
  onClose,
  crowdAttractions,
  onSetStart,
  onAddDest,
  onLocateSpot,
  t,
  lang = 'zh-CN',
  isDesktop = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [justAddedType, setJustAddedType] = useState<'start' | 'dest' | null>(null);

  if (!spotId) return null;

  // Find in crowdAttractions or MACAU_POIS
  let spot = crowdAttractions.find(a => a.id === spotId || a.name === spotId);
  const poiData = MACAU_POIS.find(p => p.id === spotId || p.id === spot?.id);

  if (!spot) {
    spot = {
      id: spotId,
      name: poiData ? t(poiData.nameKey as any) : spotId,
      region: poiData ? t(poiData.regionKey as any) : '澳门',
      crowdLevel: 0,
      status: t('data_unavailable' as any) || '数据不可用',
      statusKey: 'unknown',
      colorHex: '#6b7280',
      statusBg: '#f3f4f6',
      predictedVisitors: null
    };
  }

  const rating = poiData?.rating || 4.8;
  const reviewCount = poiData?.reviewCount || 1280;
  const rawAddress = poiData?.address || spot.region || '澳门';
  const rawTag = poiData?.tag || spot.region || '热门地标';
  const address = getLocalizedAddress(rawAddress, lang);
  const tag = getLocalizedTag(rawTag, lang);

  const handleStartClick = () => {
    onSetStart(spot.id);
    setJustAddedType('start');
    setTimeout(() => setJustAddedType(null), 2000);
  };

  const handleDestClick = () => {
    onAddDest(spot.id);
    setJustAddedType('dest');
    setTimeout(() => setJustAddedType(null), 2000);
  };

  const handleLocateClick = () => {
    if (onLocateSpot) {
      onLocateSpot(spot.id);
    }
    setIsExpanded(prev => !prev);
  };

  const containerClasses = isDesktop
    ? "absolute bottom-6 left-6 z-[1200] w-[420px] max-w-[calc(100%-3rem)] bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-gray-200/90 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto"
    : "fixed inset-x-3 bottom-3 z-[1250] bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-gray-200/90 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto";

  return (
    <div className={containerClasses}>
      {/* Toast feedback pill inside card if recently added */}
      {justAddedType && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center justify-between shadow-md animate-in fade-in duration-150">
          <span className="flex items-center gap-1.5">
            <Check size={14} className="stroke-[3]" />
            {justAddedType === 'start' 
              ? (lang === 'en' ? `Set as start: ${spot.name}` : lang === 'pt' ? `Início definido: ${spot.name}` : `已设置为起点：${spot.name}`)
              : (lang === 'en' ? `Added to route: ${spot.name}` : lang === 'pt' ? `Adicionado à rota: ${spot.name}` : `已成功加入路线：${spot.name}`)
            }
          </span>
          <span className="text-[10px] opacity-80 font-normal">
            {lang === 'en' ? 'Ready to plan' : lang === 'pt' ? 'Pronto para planear' : '即可继续规划'}
          </span>
        </div>
      )}

      {/* Top Header: Title, Tag, Crowd Badge & Close */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-extrabold text-gray-900 truncate tracking-tight">
              {spot.name}
            </h3>
            {tag && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 shrink-0">
                {tag}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
              <span className="flex items-center gap-0.5 text-amber-500 font-extrabold">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                {rating}
              </span>
            </div>

            <div className="text-[11px] text-gray-400 font-mono shrink-0 whitespace-nowrap">
              {typeof spot.predictedVisitors === 'number'
                ? `~${spot.predictedVisitors.toLocaleString()}${t('visitors_in_park') || ' 人在园'}`
                : (t('data_unavailable' as any) || '数据不可用')}
            </div>
          </div>
        </div>

        {/* Crowd Level Badge Pill on Top Right */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span 
            className="text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs flex items-center gap-1"
            style={{
              color: spot.colorHex,
              backgroundColor: spot.statusBg,
              borderColor: `${spot.colorHex}40`
            }}
          >
            <span 
              className="w-2 h-2 rounded-full animate-pulse" 
              style={{ backgroundColor: spot.colorHex }}
            />
            {spot.status}
          </span>

          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={t('close') || "关闭卡片"}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${spot.crowdLevel}%`,
            backgroundColor: spot.colorHex
          }}
        />
      </div>

      {/* 3 Prominent Action Buttons matching screenshot */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        {/* Button 1: 设为起点 */}
        <button
          onClick={handleStartClick}
          className="py-2 px-1 bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200 text-blue-700 rounded-2xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap truncate"
        >
          <Circle size={9} className="fill-blue-600 text-blue-600 shrink-0" />
          <span className="truncate">{t('set_as_start') || '设为起点'}</span>
        </button>

        {/* Button 2: 加入路线 */}
        <button
          onClick={handleDestClick}
          className="py-2 px-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-md hover:shadow-lg cursor-pointer active:scale-95 whitespace-nowrap truncate"
        >
          <Plus size={12} className="stroke-[2.5] shrink-0" />
          <span className="truncate">{t('add_as_dest') || '加入路线'}</span>
        </button>

        {/* Button 3: 人流预测 */}
        <button
          onClick={handleLocateClick}
          className="py-2 px-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap truncate"
        >
          <TrendingUp size={12} className="text-indigo-600 shrink-0" />
          <span className="truncate">{lang === 'en' ? 'Forecast' : lang === 'pt' ? 'Prognóstico' : '人流预测'}</span>
          {isExpanded ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
        </button>
      </div>

      {/* Expanded Hourly Crowd Trend Chart when "定位" or Chevron is toggled */}
      {isExpanded && (
        <div className="p-3 bg-gray-50 rounded-2xl space-y-2 text-xs border border-gray-100 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] text-gray-600 font-medium">
            <span>{lang === 'en' ? '24-Hour Crowd Forecast:' : lang === 'pt' ? 'Prognóstico de Fluxo de 24h:' : '24小时客流时段走势预测:'}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-0.5 items-end h-10 pt-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(h => {
                const hCrowd = Math.max(15, Math.round(spot.crowdLevel * Math.sin((h / 24) * Math.PI) + 10));
                return (
                  <div key={h} className="flex-1 flex flex-col items-center h-full justify-end">
                    <div 
                      className="w-full rounded-t bg-indigo-500/80 hover:bg-indigo-600 transition-all"
                      style={{ height: `${Math.min(100, hCrowd)}%` }}
                      title={`${h}:00 - ${lang === 'en' ? 'Est.' : lang === 'pt' ? 'Prev.' : '预估负荷'} ${hCrowd}%`}
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
    </div>
  );
};
