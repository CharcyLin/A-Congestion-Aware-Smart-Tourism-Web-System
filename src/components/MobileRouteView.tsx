import React, { useState } from 'react';
import { 
  Circle, 
  MapPin, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Clock, 
  Navigation, 
  Car, 
  Bus, 
  Footprints, 
  Bike, 
  ArrowUp, 
  ArrowDown, 
  GripVertical,
  RotateCcw,
  CheckCircle2,
  X,
  Layers
} from 'lucide-react';

interface MobileRouteViewProps {
  currentWaypoints: any[];
  waypointDurations: Record<string, number>;
  setWaypointDurations: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onDeleteDestination: (id: string) => void;
  onMoveWaypoint: (fromIdx: number, toIdx: number) => void;
  onOpenAddModal: () => void;
  isOptimized: boolean;
  onOptimizeRoute: () => void;
  isCalculatingRoute: boolean;
  transportMode: 'car' | 'transit' | 'walk' | 'bike';
  onTransportModeChange: (mode: 'car' | 'transit' | 'walk' | 'bike') => void;
  onClose: () => void;
  t: (key: any) => string;
  isNavigating?: boolean;
  onStartNavigation?: (fromRouteDrawer?: boolean) => void;
  hasPendingManualSort?: boolean;
  isCustomOrderSaved?: boolean;
  onConfirmManualSort?: () => void;
}

export const MobileRouteView: React.FC<MobileRouteViewProps> = ({
  currentWaypoints,
  waypointDurations,
  setWaypointDurations,
  onDeleteDestination,
  onMoveWaypoint,
  onOpenAddModal,
  isOptimized,
  onOptimizeRoute,
  isCalculatingRoute,
  transportMode,
  onTransportModeChange,
  onClose,
  t,
  isNavigating,
  onStartNavigation,
  hasPendingManualSort,
  isCustomOrderSaved,
  onConfirmManualSort
}) => {
  const [expandedWaypointIds, setExpandedWaypointIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedWaypointIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const updateDuration = (id: string, delta: number) => {
    setWaypointDurations(prev => {
      const current = prev[id] || 60;
      const next = Math.max(15, Math.min(240, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const destinationsCount = currentWaypoints.filter(w => w.type === 'dest').length;
  const isMaxDestinations = destinationsCount >= 8;

  // Calculate total travel & stay time
  const totalStayMinutes = currentWaypoints.reduce((acc, wp) => acc + (wp.durationMinutes || waypointDurations[wp.id] || 60), 0);
  const totalTravelMinutes = currentWaypoints.reduce((acc, wp) => acc + (wp.travelMinutesFromPrev || 15), 0);
  const totalMinutes = totalStayMinutes + totalTravelMinutes;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  return (
    <div className="fixed inset-0 z-[2500] bg-black/40 backdrop-blur-xs flex items-end animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 flex flex-col max-h-[85vh] transition-all animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Grab Bar & Header (Image 5 & 6) */}
      <div className="pt-2 px-4 pb-2 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Navigation size={14} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <span>{t('macau_route_mgmt') || '澳门路线管理'}</span>
              <span className="text-xs font-normal text-gray-400">
                ({t('total_prefix')}{currentWaypoints.length}{t('stations_unit')})
              </span>
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label={t('close')}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Transport Modes Toggle Bar (Image 5) */}
      <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-1.5 shrink-0">
        {[
          { id: 'transit', label: t('mode_transit'), icon: Bus },
          { id: 'walk', label: t('mode_walk'), icon: Footprints },
          { id: 'car', label: t('mode_car'), icon: Car },
          { id: 'bike', label: t('mode_bike'), icon: Bike }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = transportMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTransportModeChange(item.id as any)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                isSelected 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Icon size={13} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Waypoints List (Image 6) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-100">
        {currentWaypoints.map((wp, idx) => {
          const isStart = wp.type === 'start';
          const isExpanded = Boolean(expandedWaypointIds[wp.id]);
          const duration = wp.durationMinutes || waypointDurations[wp.id] || 60;
          const destIndex = isStart
            ? 0
            : (wp.stopIndex !== undefined && wp.stopIndex !== null && wp.stopIndex > 0
                ? wp.stopIndex
                : currentWaypoints.filter(w => w.type === 'dest').indexOf(wp) + 1);

          return (
            <div 
              key={wp.id} 
              className={`pt-2.5 first:pt-0 ${
                isStart ? 'border-none' : ''
              }`}
            >
              {/* Card container */}
              <div className="p-3 rounded-2xl border transition-all bg-white border-gray-200/90 shadow-2xs hover:border-indigo-200">
                {/* Main Card Row */}
                <div className="flex items-center justify-between gap-2">
                  {/* Left Number / Badge */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs font-mono">
                        {isStart ? 'S' : destIndex}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-gray-900 truncate">
                          {isStart ? `${t('start_point')} · ${wp.name}` : `${t('destination_point')} ${destIndex} · ${wp.name}`}
                        </span>
                      </div>

                      {/* Travel info if available */}
                      {wp.time && (
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
                          <Clock size={11} className="text-gray-400" />
                          <span>{isStart ? `${t('departure_time')}: ${wp.time}` : `${t('estimated_arrival')}: ${wp.time}`}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Crowd Status Light (Green / Yellow / Red) + Reorder Controls + Arrow */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Compact Crowd Status Indicator on Right (Red / Yellow / Green) */}
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border shadow-2xs"
                      style={{
                        color: wp.colorHex || '#10b981',
                        backgroundColor: wp.statusBg || '#ecfdf5',
                        borderColor: `${wp.colorHex || '#10b981'}33`
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: wp.colorHex || wp.bg || '#10b981' }}
                      />
                      <span>{wp.crowdStatus || (t('data_unavailable') || '数据不可用')}</span>
                    </span>

                    {/* Reorder Buttons (for destinations) */}
                    {!isStart && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onMoveWaypoint(idx, idx - 1)}
                          disabled={idx <= 1}
                          className="p-1 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-gray-100"
                          title={t('move_up')}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => onMoveWaypoint(idx, idx + 1)}
                          disabled={idx >= currentWaypoints.length - 1}
                          className="p-1 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-gray-100"
                          title={t('move_down')}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    )}

                    {/* Expand/Collapse Arrow */}
                    <button
                      onClick={() => toggleExpand(wp.id)}
                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-transform"
                      title={isExpanded ? t('collapse') : t('expand')}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {/* Delete Destination Button */}
                    {!isStart && destinationsCount > 1 && (
                      <button
                        onClick={() => onDeleteDestination(wp.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title={t('delete_dest')}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Section (Down Arrow Unfolds duration & schedule) */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2 text-xs">
                    {/* Stay Duration Adjuster */}
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl">
                      <span className="text-gray-600 font-medium">{t('visit_duration')}:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateDuration(wp.id, -15)}
                          className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center shadow-2xs"
                        >
                          -
                        </button>
                        <span className="font-bold text-gray-800 w-14 text-center font-mono">
                          {duration} {t('minutes_unit')}
                        </span>
                        <button
                          onClick={() => updateDuration(wp.id, 15)}
                          className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Detailed Schedule Time */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-gray-50 rounded-xl">
                        <span className="text-gray-400 block text-[10px]">{isStart ? t('departure_time') : t('estimated_arrival')}</span>
                        <span className="font-bold text-gray-800 font-mono">{wp.time || '10:00'}</span>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-xl">
                        <span className="text-gray-400 block text-[10px]">{isStart ? t('route_status') : t('estimated_departure')}</span>
                        <span className="font-bold text-gray-800 font-mono">{isStart ? t('route_ready') : (wp.departureTime || '--:--')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Plus Button to Add Destination (Up to 8 max) */}
        <div className="pt-2">
          <button
            onClick={onOpenAddModal}
            className={`w-full py-2.5 px-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              isMaxDestinations
                ? 'bg-gray-50 border-gray-200 text-gray-500'
                : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50/60 hover:border-indigo-400'
            }`}
          >
            <Plus size={15} />
            <span>
              {isMaxDestinations ? t('max_dest_reached') : t('add_dest_limit')}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Summary Bar & AI Optimize Trigger (Image 5 & 6) */}
      <div className="p-3.5 bg-white border-t border-gray-100 space-y-2.5 shrink-0">
        {/* Estimated Summary Info */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div>
            <span className="font-bold text-gray-900 text-sm">
              {t('route_total_duration').replace('{hours}', String(totalHours)).replace('{minutes}', String(remainingMins))}
            </span>
            <span className="text-gray-400 text-[11px] ml-1.5">
              ({t('route_duration_includes')})
            </span>
          </div>

          {isOptimized && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={11} />
              {isCustomOrderSaved ? t('custom_order_saved') : t('route_ai_ready')}
            </span>
          )}
        </div>

        {hasPendingManualSort && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t('pending_order_notice')}
          </div>
        )}

        {/* Action Buttons: AI Re-plan & Start Navigation */}
        <div className="flex gap-2">
          <button
            onClick={onOptimizeRoute}
            disabled={isCalculatingRoute}
            className={`py-3 px-3.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isOptimized 
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200' 
                : 'flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md'
            }`}
          >
            <Sparkles size={15} />
            <span>{isCalculatingRoute ? t('route_calculating') : isOptimized ? t('route_reoptimize') : t('route_optimize')}</span>
          </button>

          {hasPendingManualSort && onConfirmManualSort && (
            <button
              onClick={() => onConfirmManualSort()}
              disabled={isCalculatingRoute}
              className="py-3 px-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{t('confirm_order')}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onStartNavigation) {
                onStartNavigation(true);
              } else {
                onClose();
              }
            }}
            disabled={Boolean(hasPendingManualSort) || isCalculatingRoute}
            className="flex-1 py-3 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Navigation size={16} />
            <span>{isNavigating ? t('continue_navigation') : t('start_route_navigation')}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
