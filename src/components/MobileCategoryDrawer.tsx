import React, { useState } from 'react';
import { X, Star, MapPin, Navigation, ArrowUpDown, Circle, Plus, Check, Filter } from 'lucide-react';
import { MACAU_POIS } from '../constants';
import { getLocalizedAddress, getLocalizedTag } from '../utils/translateHelper';

interface MobileCategoryDrawerProps {
  category: string | null;
  onClose: () => void;
  crowdAttractions: any[];
  onSelectSpot: (id: string) => void;
  onSetStart: (id: string) => void;
  onAddDest: (id: string) => void;
  t: (key: any) => string;
  lang?: string;
}

export const MobileCategoryDrawer: React.FC<MobileCategoryDrawerProps> = ({
  category,
  onClose,
  crowdAttractions,
  onSelectSpot,
  onSetStart,
  onAddDest,
  t,
  lang = 'zh-CN'
}) => {
  const [filterType, setFilterType] = useState<'all' | 'comfortable' | 'crowd_asc' | 'rating'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!category) return null;

  const categoryTitles: Record<string, { label: string; enLabel: string; ptLabel: string; icon: string }> = {
    food: { label: '餐馆与地道美食', enLabel: 'Restaurants & Local Delicacies', ptLabel: 'Restaurantes e Gastronomia', icon: '🍽️' },
    hotel: { label: '酒店与奢华度假村', enLabel: 'Hotels & Luxury Resorts', ptLabel: 'Hotéis e Resorts de Luxo', icon: '🛏️' },
    cafe: { label: '咖啡馆与茶歇', enLabel: 'Cafes & Teahouses', ptLabel: 'Cafés e Chás', icon: '☕' },
    attraction: { label: '景点与世界文化遗产', enLabel: 'Attractions & World Heritage', ptLabel: 'Atracções e Património Mundial', icon: '🏛️' },
    shopping: { label: '购物百货与免税中心', enLabel: 'Shopping Malls & Duty Free', ptLabel: 'Centros Comerciais e Duty Free', icon: '🛍️' },
    port: { label: '口岸交通与航站码头', enLabel: 'Port Hubs & Terminals', ptLabel: 'Hubs de Transporte e Portos', icon: '🚢' }
  };

  const meta = categoryTitles[category] || { label: '景点探索', enLabel: 'Explore Attractions', ptLabel: 'Explorar Atracções', icon: '📍' };
  const localizedTitle = lang === 'en' ? meta.enLabel : lang === 'pt' ? meta.ptLabel : meta.label;

  // Filter items matching category
  let matchedItems = crowdAttractions.filter(attr => {
    if (category === 'attraction') {
      return attr.category === 'heritage' || attr.category === 'landmark' || attr.category === 'nature';
    }
    if (category === 'food') {
      return attr.category === 'food';
    }
    if (category === 'cafe') {
      return attr.category === 'cafe';
    }
    if (category === 'hotel') {
      return attr.category === 'hotel' || attr.category === 'resort';
    }
    if (category === 'shopping') {
      return attr.category === 'shopping' || attr.category === 'resort';
    }
    if (category === 'port') {
      return attr.category === 'port';
    }
    return true;
  });

  // Apply sub-filters
  if (filterType === 'comfortable') {
    matchedItems = matchedItems.filter(i => i.statusKey === 'comfortable' || i.statusKey === 'moderate');
  } else if (filterType === 'crowd_asc') {
    matchedItems = [...matchedItems].sort((a, b) => a.crowdLevel - b.crowdLevel);
  } else if (filterType === 'rating') {
    matchedItems = [...matchedItems].sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
  }

  return (
    <div className={`fixed inset-x-0 bottom-0 z-[1150] bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 transition-all duration-300 flex flex-col ${
      isExpanded ? 'h-[88vh]' : 'h-[52vh]'
    }`}>
      {/* Pull Handle & Header */}
      <div 
        className="pt-2 px-4 pb-2 border-b border-gray-100 cursor-pointer select-none shrink-0"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <span>{localizedTitle}</span>
                <span className="text-xs text-gray-400 font-normal">
                  ({matchedItems.length}{lang === 'en' ? ' spots' : lang === 'pt' ? ' locais' : '处'})
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Chips Bar (Image 3 Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterType('all');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              filterType === 'all' 
                ? 'bg-gray-900 text-white shadow-xs' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('filter_all') || '全部'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterType('comfortable');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 ${
              filterType === 'comfortable' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            {lang === 'en' ? 'Comfort First' : lang === 'pt' ? 'Conforto Primeiro' : '舒适/畅通优先'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterType('crowd_asc');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 ${
              filterType === 'crowd_asc' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ArrowUpDown size={11} />
            {lang === 'en' ? 'Crowd Low-to-High' : lang === 'pt' ? 'Fluxo Crescente' : '客流从少到多'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterType('rating');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 ${
              filterType === 'rating' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {lang === 'en' ? 'Top Rated' : lang === 'pt' ? 'Melhor Classificado' : '评分最高'}
          </button>
        </div>
      </div>

      {/* Places List (Image 3) */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-2">
        {matchedItems.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            {lang === 'en' ? 'No matching places found' : lang === 'pt' ? 'Nenhum local encontrado' : '暂无符合当前筛选条件的地点'}
          </div>
        ) : (
          matchedItems.map(item => {
            const poiData = MACAU_POIS.find(p => p.id === item.id);
            const rating = poiData?.rating || 4.7;
            const reviewCount = poiData?.reviewCount || 1200;
            const rawAddress = poiData?.address || item.region;
            const rawTag = poiData?.tag || item.region;
            const address = getLocalizedAddress(rawAddress, lang);
            const tag = getLocalizedTag(rawTag, lang);

            return (
              <div 
                key={item.id}
                onClick={() => onSelectSpot(item.id)}
                className="p-3 bg-white rounded-2xl hover:bg-gray-50/80 transition-all border border-gray-100/80 space-y-2 cursor-pointer shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{item.name}</h4>
                      {tag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                          {tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {rating}
                      </span>
                      <span className="text-gray-400">({reviewCount})</span>
                      <span>·</span>
                      <span className="truncate">{address}</span>
                    </div>
                  </div>

                  {/* Real-time Crowd Badge */}
                  <div className="text-right shrink-0">
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border shadow-2xs"
                      style={{
                        color: item.colorHex,
                        backgroundColor: item.statusBg,
                        borderColor: `${item.colorHex}40`
                      }}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: item.colorHex }}
                      />
                      {item.status}
                    </span>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      ~{item.predictedVisitors.toLocaleString()}{lang === 'en' ? ' visitors' : lang === 'pt' ? ' visitantes' : ' 人'}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons (Image 3/4) */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      onSetStart(item.id);
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Circle size={10} className="fill-blue-600 text-blue-600" />
                    {t('set_as_start') || '设为起点'}
                  </button>
                  <button
                    onClick={() => {
                      onAddDest(item.id);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Plus size={13} />
                    {t('add_as_dest') || '加入路线'}
                  </button>
                  <button
                    onClick={() => {
                      onSelectSpot(item.id);
                      onClose();
                    }}
                    className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 border border-gray-200 text-xs font-semibold flex items-center gap-1"
                    title={t('locate_on_map') || "在地图上查看"}
                  >
                    <MapPin size={13} />
                    {t('locate_on_map') || '定位'}
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
