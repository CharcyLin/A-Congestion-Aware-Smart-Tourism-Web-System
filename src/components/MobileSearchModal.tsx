import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  X, 
  Home, 
  Briefcase, 
  Plus, 
  Clock, 
  MapPin, 
  Sparkles, 
  Circle, 
  Navigation,
  Compass,
  Building2,
  Coffee,
  UtensilsCrossed,
  Landmark,
  Ship,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { MACAU_POIS } from '../constants';
import { matchPoi } from '../utils/searchHelper';
import { getLocalizedAddress, getLocalizedTag } from '../utils/translateHelper';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  crowdAttractions: any[];
  onSelectSpot: (id: string) => void;
  onSetCustomStart: (name: string) => void;
  onAddCustomDest: (name: string) => void;
  onOpenEnvModal: () => void;
  translations?: any;
  lang?: string;
  t: (key: any) => string;
}

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
  isOpen,
  onClose,
  crowdAttractions,
  onSelectSpot,
  onSetCustomStart,
  onAddCustomDest,
  onOpenEnvModal,
  translations = {},
  lang = 'zh-CN',
  t
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedLiveQuery = query.trim();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter spots with comprehensive search matcher and scoring
  const searchResultsWithScore = crowdAttractions
    .map(attr => {
      if (!normalizedLiveQuery) {
        return { attr, matched: true, score: 0 };
      }
      const match = matchPoi(attr.id, normalizedLiveQuery, translations, lang);
      return { attr, matched: match.matched, score: match.score };
    })
    .filter(item => item.matched)
    .sort((a, b) => b.score - a.score);

  const filtered = searchResultsWithScore.map(item => item.attr);

  // Popular curated spots when query is empty
  const popularIds = [
    'ruins', 
    'venetian', 
    'cunha', 
    'grand_lisboa', 
    'londoner', 
    'parisian', 
    'wynn_palace', 
    'sei_kee_cafe', 
    'morpheus_hotel', 
    'wong_chi_kei', 
    'border_gate', 
    'outer_harbour', 
    'mpu_dorm'
  ];

  const displayItems = normalizedLiveQuery
    ? filtered
    : [
        ...crowdAttractions.filter(a => popularIds.includes(a.id)),
        ...crowdAttractions.filter(a => !popularIds.includes(a.id))
      ];

  // Handle Enter key for fast keyboard selection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        onSelectSpot(filtered[0].id);
        onClose();
      } else if (normalizedLiveQuery) {
        onAddCustomDest(normalizedLiveQuery);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-white flex flex-col animate-in fade-in duration-150">
      {/* Search Header */}
      <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-white shadow-xs shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
          aria-label={lang === 'en' ? 'Back' : lang === 'pt' ? 'Voltar' : '返回'}
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 bg-gray-100/90 rounded-full flex items-center px-3.5 py-2 gap-2 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:bg-white transition-all border border-transparent focus-within:border-indigo-200">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              lang === 'en' 
                ? "Search attractions, restaurants, hotels, cafes, ports or custom address..." 
                : lang === 'pt' 
                ? "Pesquisar atracções, restaurantes, hotéis, cafés, portos ou endereço..." 
                : "搜索景点、餐馆、酒店、咖啡馆、购物、口岸或输入任意地址..."
            }
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              title={lang === 'en' ? "Clear" : "清空"}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Shortcuts Chips Bar */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 bg-gray-50/70">
        <button
          onClick={() => {
            onSetCustomStart(lang === 'en' ? 'Home (Hotel/Stay)' : lang === 'pt' ? 'Acomodação (Hotel/Residência)' : '住址 (酒店/住处)');
            onClose();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 shrink-0 cursor-pointer"
        >
          <Home size={13} className="text-blue-600" />
          <span>{lang === 'en' ? 'Home' : lang === 'pt' ? 'Residência' : '住址'}</span>
        </button>

        <button
          onClick={() => {
            onSetCustomStart(lang === 'en' ? 'Work / Expo' : lang === 'pt' ? 'Trabalho / Convenção' : '工作地址 / 会展');
            onClose();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 shrink-0 cursor-pointer"
        >
          <Briefcase size={13} className="text-amber-600" />
          <span>{lang === 'en' ? 'Work' : lang === 'pt' ? 'Trabalho' : '工作地址'}</span>
        </button>

        <button
          onClick={() => setQuery(lang === 'en' ? 'Cafe' : lang === 'pt' ? 'Café' : '咖啡')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/80 border border-amber-200 rounded-full text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 shrink-0 cursor-pointer"
        >
          <span>☕</span>
          <span>{lang === 'en' ? 'Cafes' : lang === 'pt' ? 'Cafés' : '咖啡馆'}</span>
        </button>

        <button
          onClick={() => setQuery(lang === 'en' ? 'Hotel' : lang === 'pt' ? 'Hotel' : '酒店')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 border border-blue-200 rounded-full text-xs font-semibold text-blue-900 shadow-2xs hover:bg-blue-100 shrink-0 cursor-pointer"
        >
          <span>🛏️</span>
          <span>{lang === 'en' ? 'Luxury Hotels' : lang === 'pt' ? 'Hotéis Luxuosos' : '奢华酒店'}</span>
        </button>

        <button
          onClick={() => setQuery(lang === 'en' ? 'Food' : lang === 'pt' ? 'Comida' : '美食')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/80 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-100 shrink-0 cursor-pointer"
        >
          <span>🍽️</span>
          <span>{lang === 'en' ? 'Local Food' : lang === 'pt' ? 'Gastronomia' : '地道美食'}</span>
        </button>

        <button
          onClick={() => setQuery(lang === 'en' ? 'Attraction' : lang === 'pt' ? 'Atracção' : '景点')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/80 border border-purple-200 rounded-full text-xs font-semibold text-purple-900 shadow-2xs hover:bg-purple-100 shrink-0 cursor-pointer"
        >
          <span>🏛️</span>
          <span>{lang === 'en' ? 'Hot Attractions' : lang === 'pt' ? 'Atracções Populares' : '热门景点'}</span>
        </button>

        <button
          onClick={() => setQuery(lang === 'en' ? 'Port' : lang === 'pt' ? 'Porto' : '口岸')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-900 shadow-2xs hover:bg-indigo-100 shrink-0 cursor-pointer"
        >
          <span>🚢</span>
          <span>{lang === 'en' ? 'Ports & Transit' : lang === 'pt' ? 'Portos e Tráfego' : '口岸交通'}</span>
        </button>
      </div>

      {/* Search Content Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 relative">

        {/* Prominent Quick Action Card for Custom Location Input */}
        {normalizedLiveQuery && (
          <div className="p-3.5 mb-2 bg-gradient-to-br from-indigo-50/90 via-blue-50/90 to-white rounded-2xl border-2 border-indigo-200/80 shadow-md space-y-2.5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-950 truncate">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={13} />
                </div>
                <span className="truncate text-sm">
                  {lang === 'en' ? `Custom Location / Search: "${normalizedLiveQuery}"` : lang === 'pt' ? `Local Personalizado / Busca: "${normalizedLiveQuery}"` : `自定义地点 / 搜索: 「${normalizedLiveQuery}」`}
                </span>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shrink-0 shadow-2xs">
                {filtered.length > 0 
                  ? (lang === 'en' ? `Matched ${filtered.length} spots` : lang === 'pt' ? `${filtered.length} correspondentes` : `匹配 ${filtered.length} 处地标`)
                  : (lang === 'en' ? 'Custom Address' : lang === 'pt' ? 'Endereço Personalizado' : '自定义地址')
                }
              </span>
            </div>
            
            <p className="text-xs text-gray-600">
              {lang === 'en' 
                ? "You can directly set this custom location in your route or view the matching locations below:" 
                : lang === 'pt' 
                ? "Pode definir este local personalizado diretamente na rota ou ver as correspondências abaixo:" 
                : "您可以直接将此输入添加至行程中，或查看下方匹配的景点客流详情："
              }
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => {
                  onSetCustomStart(normalizedLiveQuery);
                  onClose();
                }}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <Circle size={12} className="fill-white" />
                <span>{t('set_as_start') || '设为起点'}</span>
              </button>

              <button
                onClick={() => {
                  onAddCustomDest(normalizedLiveQuery);
                  onClose();
                }}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <Plus size={14} />
                <span>{t('add_as_dest') || '加入路线'}</span>
              </button>

              {filtered.length > 0 && (
                <button
                  onClick={() => {
                    onSelectSpot(filtered[0].id);
                    onClose();
                  }}
                  className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <MapPin size={13} />
                  <span>{lang === 'en' ? 'View Best Match' : lang === 'pt' ? 'Ver Melhor Correspondência' : '查看首选客流'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <span>
            {normalizedLiveQuery 
              ? (lang === 'en' ? `Matching Spots & Landmarks (${filtered.length})` : lang === 'pt' ? `Pontos Correspondentes (${filtered.length})` : `搜索匹配景点与地标 (${filtered.length})`)
              : (lang === 'en' ? 'Popular Recommendations' : lang === 'pt' ? 'Recomendações Populares' : '热门推荐与地标')
            }
          </span>
          <span className="text-[10px] font-normal text-gray-400 lowercase">
            {lang === 'en' ? 'Click to locate on map' : lang === 'pt' ? 'Clique para ver no mapa' : '点击直接定位并弹出客流看板'}
          </span>
        </div>

        {/* Empty State when no direct matches */}
        {normalizedLiveQuery && filtered.length === 0 && (
          <div className="py-8 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <MapPin size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-800">
                {lang === 'en' ? 'No matching known spots found' : lang === 'pt' ? 'Sem locais conhecidos correspondentes' : '未找到直接匹配的已知景点'}
              </p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                {lang === 'en' 
                  ? "We have provided convenient 'Set as Start' and 'Add to Route' buttons at the top to auto-plan routes dynamically for your custom address." 
                  : lang === 'pt' 
                  ? "Preparámos botões de atalho no topo para definir como início ou adicionar à rota para planeamento automático."
                  : "已为您在顶部准备一键「设为起点」与「加入路线」快捷卡片，系统将为您自动规划路线。"}
              </p>
            </div>
          </div>
        )}

        {/* List of Spots */}
        {displayItems.map(item => {
          const poiData = MACAU_POIS.find(p => p.id === item.id);
          const rawAddress = poiData?.address || item.region;
          const rawTag = poiData?.tag || item.region;
          const address = getLocalizedAddress(rawAddress, lang);
          const tag = getLocalizedTag(rawTag, lang);
          const isRecent = popularIds.includes(item.id);
          const regionLabel = poiData ? t(poiData.regionKey as any) : item.region;

          return (
            <div
              key={item.id}
              onClick={() => {
                onSelectSpot(item.id);
                onClose();
              }}
              className="p-3 hover:bg-indigo-50/60 flex items-center justify-between gap-3 cursor-pointer rounded-2xl transition-all active:scale-[0.99] border border-transparent hover:border-indigo-100"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 shadow-2xs">
                  {isRecent && !query ? (
                    <Clock size={16} className="text-gray-400" />
                  ) : item.category === 'cafe' ? (
                    <span className="text-base">☕</span>
                  ) : item.category === 'hotel' || item.category === 'resort' ? (
                    <span className="text-base">🛏️</span>
                  ) : item.category === 'food' ? (
                    <span className="text-base">🍽️</span>
                  ) : item.category === 'port' ? (
                    <span className="text-base">🚢</span>
                  ) : item.category === 'shopping' ? (
                    <span className="text-base">🛍️</span>
                  ) : (
                    <MapPin size={18} className="text-indigo-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-gray-900 truncate">{item.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded font-medium shrink-0">
                      {regionLabel}
                    </span>
                    {tag && tag !== regionLabel && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-medium shrink-0 hidden sm:inline-block">
                        {tag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {address}
                  </div>
                </div>
              </div>

              {/* Real-time Crowd status on the right */}
              <div className="text-right shrink-0">
                <span 
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs"
                  style={{
                    color: item.colorHex,
                    backgroundColor: item.statusBg,
                    borderColor: `${item.colorHex}35`
                  }}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full animate-pulse" 
                    style={{ backgroundColor: item.colorHex }}
                  />
                  {item.status}
                </span>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                  ~{item.predictedVisitors?.toLocaleString()}{lang === 'en' ? ' visitors' : lang === 'pt' ? ' visitantes' : ' 人'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
