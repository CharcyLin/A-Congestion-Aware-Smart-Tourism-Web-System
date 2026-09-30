import React from 'react';
import { 
  ShieldCheck, 
  Car, 
  Bus, 
  Footprints, 
  Bike, 
  Sun, 
  CloudDrizzle, 
  CloudRain, 
  Calendar, 
  ChevronDown, 
  ChevronLeft,
  Circle, 
  MapPin, 
  Clock, 
  Trash2, 
  Edit3, 
  List, 
  Plus, 
  Navigation, 
  Loader2, 
  Sparkles, 
  RotateCcw,
  History,
  AlertCircle
} from 'lucide-react';
import { MACAU_POIS } from '../constants';

interface PlanContentProps {
  t: (key: any) => string;
  lang?: string;
  isOptimized: boolean;
  setIsOptimized: (opt: boolean) => void;
  isLstmAssisted: boolean;
  routeOptimizationSummary: any;
  transportMode: 'car' | 'transit' | 'walk' | 'bike';
  handleTransportModeChange: (mode: 'car' | 'transit' | 'walk' | 'bike') => void;
  isEnvExpanded: boolean;
  setIsEnvExpanded: (expanded: boolean) => void;
  envMode: 'auto' | 'scenario';
  setEnvMode: (mode: 'auto' | 'scenario') => void;
  realtimeEnv: any;
  rainfallMm: number;
  setRainfallMm: (mm: number) => void;
  holidayStage: 'pre' | 'in' | 'post' | 'none';
  setHolidayStage: (stage: 'pre' | 'in' | 'post' | 'none') => void;
  handleOptimizeRoute: () => void;
  fetchRealtimeEnv: () => void;
  currentWaypoints: any[];
  startTime: string;
  setStartTime: (time: string) => void;
  liveBeijingTimeStr: string;
  getLiveBeijingTime: () => { timeStr: string; hour: number; minute: number };
  handleToggleCustomMode: (id: string, isCustom: boolean) => void;
  handleDeleteDestination: (id: string) => void;
  handleSetCustomLocation: (id: string, name: string) => void;
  handleSelectPoi: (id: string, poiId: string) => void;
  waypointDurations: { [key: string]: number };
  setWaypointDurations: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  handleAddDestination: () => void;
  isCalculatingRoute: boolean;
  onNavigateToMap?: () => void;
  onStartNavigation?: (fromRouteDrawer?: boolean) => void;
  hasPendingManualSort?: boolean;
  isCustomOrderSaved?: boolean;
  onConfirmManualSort?: () => void;
  onClearPlan?: () => void;
  onOpenHistory?: () => void;
}

export const PlanContent: React.FC<PlanContentProps> = ({
  t,
  lang = 'zh-CN',
  isOptimized,
  setIsOptimized,
  isLstmAssisted,
  routeOptimizationSummary,
  transportMode,
  handleTransportModeChange,
  isEnvExpanded,
  setIsEnvExpanded,
  envMode,
  setEnvMode,
  realtimeEnv,
  rainfallMm,
  setRainfallMm,
  holidayStage,
  setHolidayStage,
  handleOptimizeRoute,
  fetchRealtimeEnv,
  currentWaypoints,
  startTime,
  setStartTime,
  liveBeijingTimeStr,
  getLiveBeijingTime,
  handleToggleCustomMode,
  handleDeleteDestination,
  handleSetCustomLocation,
  handleSelectPoi,
  waypointDurations,
  setWaypointDurations,
  handleAddDestination,
  isCalculatingRoute,
  onNavigateToMap,
  onStartNavigation,
  hasPendingManualSort,
  isCustomOrderSaved,
  onConfirmManualSort,
  onClearPlan,
  onOpenHistory
}) => {
  const autoWeatherAvailable = realtimeEnv.weather_available &&
    typeof realtimeEnv.rainfall_prev_1h_mm === 'number' &&
    Number.isFinite(realtimeEnv.rainfall_prev_1h_mm);
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="p-3.5 border-b border-gray-100 bg-white space-y-3 shrink-0">
        {isOptimized ? (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 truncate">
                <ShieldCheck size={15} className="shrink-0 text-emerald-600" />
                {t('ai_optimized')}
              </h2>
              {isLstmAssisted && (
                <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {lang === 'en' ? 'LSTM used' : lang === 'pt' ? 'LSTM usado' : '已使用 LSTM'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium leading-relaxed mt-1">
              {isCustomOrderSaved
                ? (lang === 'en' ? 'Custom visiting order saved and will be used for navigation.' : lang === 'pt' ? 'A ordem personalizada foi guardada e será usada na navegação.' : '已保存自定义游览顺序，导航将按此顺序进行。')
                : routeOptimizationSummary?.isReordered 
                ? (t('reordered_saved') || '已为您智能重排路线，避开人流高峰')
                : (lang === 'en' ? 'Current visiting order retained after the crowd check.' : lang === 'pt' ? 'Ordem atual mantida após verificar a afluência.' : '已检查客流，保留当前游览顺序。')}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">{t('plan_route')}</h2>
            {/* Desktop Quick Action Buttons */}
            <div className="hidden md:flex items-center gap-1.5">
              {onClearPlan && (
                <button
                  onClick={onClearPlan}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title={t('clear_plan')}
                >
                  <Trash2 size={12} />
                  <span>{t('clear_plan')}</span>
                </button>
              )}
              {onOpenHistory && (
                <button
                  onClick={onOpenHistory}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title={t('route_history')}
                >
                  <History size={12} />
                  <span>{t('route_history')}</span>
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Transport Modes */}
        <div className="flex justify-between bg-gray-50 p-1 rounded-lg border border-gray-200">
          {[
            { id: 'car', icon: Car },
            { id: 'transit', icon: Bus },
            { id: 'walk', icon: Footprints },
            { id: 'bike', icon: Bike }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => handleTransportModeChange(mode.id as any)}
              className={`p-1.5 rounded-md flex-1 flex justify-center transition-all cursor-pointer ${transportMode === mode.id ? 'bg-white shadow-xs text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <mode.icon size={16} />
            </button>
          ))}
        </div>

        {/* Exogenous Features for LSTM: Weather & Holiday (Collapsible) */}
        <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs overflow-hidden transition-all shadow-2xs">
          {/* Collapsible Header Button */}
          <button
            type="button"
            onClick={() => setIsEnvExpanded(!isEnvExpanded)}
            className="w-full flex items-center justify-between p-2.5 hover:bg-indigo-50/80 transition-colors text-left select-none cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                {envMode === 'auto' ? (
                  !autoWeatherAvailable ? <AlertCircle size={12} className="text-amber-600" /> :
                  realtimeEnv.rainfall_prev_1h_mm <= 0 ? <Sun size={12} className="text-amber-600" /> :
                  realtimeEnv.rainfall_prev_1h_mm <= 5 ? <CloudDrizzle size={12} className="text-sky-600" /> :
                  <CloudRain size={12} className="text-blue-600" />
                ) : (
                  rainfallMm <= 0 ? <Sun size={12} className="text-amber-600" /> :
                  rainfallMm <= 5 ? <CloudDrizzle size={12} className="text-sky-600" /> :
                  <CloudRain size={12} className="text-blue-600" />
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-[11px] font-bold text-gray-800 shrink-0">
                  {t('env_mode_title')}
                </span>
                <span className="text-[10px] font-semibold bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded shrink-0 shadow-2xs flex items-center gap-1">
                  {envMode === 'auto' ? (
                    <>
                      {!autoWeatherAvailable ? (
                        <span className="text-amber-700">{t('weather_unavailable')}</span>
                      ) : realtimeEnv.rainfall_prev_1h_mm <= 0 ? (
                        <span className="flex items-center gap-0.5 text-amber-600"><Sun size={10} /> {t('weather_no_rain')}</span>
                      ) : realtimeEnv.rainfall_prev_1h_mm <= 5 ? (
                        <span className="flex items-center gap-0.5 text-sky-600"><CloudDrizzle size={10} /> {t('weather_light_rain')}</span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-blue-600"><CloudRain size={10} /> {t('weather_heavy_rain')}</span>
                      )}
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-600">
                        {realtimeEnv.holiday_stage === 'none' ? t('holiday_stage_none') : (t(('holiday_stage_' + realtimeEnv.holiday_stage) as any) || realtimeEnv.holiday_stage)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-indigo-500 font-normal">{t('simulated_tag')}:</span>
                      {rainfallMm <= 0 ? (
                        <span className="flex items-center gap-0.5 text-amber-600"><Sun size={10} /> {t('weather_no_rain')}</span>
                      ) : rainfallMm <= 5 ? (
                        <span className="flex items-center gap-0.5 text-sky-600"><CloudDrizzle size={10} /> {t('weather_light_rain')}</span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-blue-600"><CloudRain size={10} /> {t('weather_heavy_rain')}</span>
                      )}
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-600">
                        {holidayStage === 'none' ? t('holiday_stage_none') : (t(('holiday_stage_' + holidayStage) as any) || holidayStage)}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-gray-500">
              <span className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800">
                {isEnvExpanded ? t('collapse') : t('expand')}
              </span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 text-gray-500 ${isEnvExpanded ? 'rotate-180 text-indigo-600' : ''}`} 
              />
            </div>
          </button>

          {/* Expanded Content Panel */}
          {isEnvExpanded && (
            <div className="p-2.5 pt-1 border-t border-indigo-100/60 space-y-2.5">
              {/* Mode Selector: Auto Govt API vs Manual Scenario */}
              <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100/60">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t('mode_select_label')}
                </span>
                <div className="flex bg-white rounded-lg p-0.5 border border-indigo-100">
                  <button
                    onClick={() => {
                      setEnvMode('auto');
                      if (autoWeatherAvailable) setRainfallMm(realtimeEnv.rainfall_prev_1h_mm);
                      setHolidayStage(realtimeEnv.holiday_stage);
                      if (isOptimized) handleOptimizeRoute();
                    }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      envMode === 'auto'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {t('mode_auto_govt')}
                  </button>
                  <button
                    onClick={() => setEnvMode('scenario')}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      envMode === 'scenario'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {t('mode_manual_scenario')}
                  </button>
                </div>
              </div>

              {envMode === 'auto' ? (
                /* Auto Mode: Live Government Telemetry */
                <div className="space-y-2 py-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-700 font-semibold text-[11px]">
                      <CloudRain size={13} className="text-blue-500" />
                      <span>{t('weather_label')}:</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold text-gray-700">
                      {!autoWeatherAvailable ? (
                        <span className="text-amber-700">{t('weather_unavailable')}</span>
                      ) : realtimeEnv.rainfall_prev_1h_mm <= 0 ? (
                        <>
                          <Sun size={12} className="text-amber-500" />
                          <span>{t('weather_no_rain')}</span>
                        </>
                      ) : realtimeEnv.rainfall_prev_1h_mm <= 5 ? (
                        <>
                          <CloudDrizzle size={12} className="text-sky-500" />
                          <span>{t('weather_light_rain')}</span>
                        </>
                      ) : (
                        <>
                          <CloudRain size={12} className="text-blue-600" />
                          <span>{t('weather_heavy_rain')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-700 font-semibold text-[11px]">
                      <Calendar size={13} className="text-amber-500" />
                      <span>{t('holiday_stage_label')}:</span>
                    </div>
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold text-gray-700">
                      {realtimeEnv.holiday_stage === 'none' 
                        ? t('holiday_stage_none') 
                        : (t(('holiday_stage_' + realtimeEnv.holiday_stage) as any) || realtimeEnv.holiday_stage)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-gray-500">
                    <span className="truncate pr-1">
                      {!autoWeatherAvailable
                        ? (lang === 'en' ? 'Weather unavailable · calendar estimate' : lang === 'pt' ? 'Meteorologia indisponível · calendário estimado' : lang === 'zh-TW' ? '天氣資料暫不可用 · 節假日曆估算' : '天气数据暂不可用 · 节假日历估算')
                        : realtimeEnv.connected_to_python
                        ? (lang === 'en' ? '✓ Open-Meteo weather · model calendar' : lang === 'pt' ? '✓ Meteorologia Open-Meteo · calendário do modelo' : '✓ Open-Meteo 天气 · 模型节假日历')
                        : (lang === 'en' ? '✓ Open-Meteo weather · calendar estimate' : lang === 'pt' ? '✓ Meteorologia Open-Meteo · calendário estimado' : '✓ Open-Meteo 天气 · 节假日历估算')}
                    </span>
                    <button
                      onClick={fetchRealtimeEnv}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold shrink-0 cursor-pointer"
                      title="Refresh live data"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              ) : (
                /* Manual Scenario Mode */
                <div className="space-y-2.5">
                  {/* Weather - Rainfall options with intuitive icons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-700 font-semibold text-[11px]">
                      <CloudRain size={13} className="text-blue-500" />
                      <span>{t('weather_label')}:</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'no_rain', labelKey: 'weather_no_rain', val: 0.0, icon: Sun, color: 'text-amber-500' },
                        { id: 'light_rain', labelKey: 'weather_light_rain', val: 5.0, icon: CloudDrizzle, color: 'text-sky-500' },
                        { id: 'heavy_rain', labelKey: 'weather_heavy_rain', val: 20.0, icon: CloudRain, color: 'text-blue-600' }
                      ].map(r => {
                        const Icon = r.icon;
                        const isSelected = rainfallMm === r.val;
                        return (
                          <button
                            key={r.val}
                            type="button"
                            onClick={() => {
                              setRainfallMm(r.val);
                              if (isOptimized) handleOptimizeRoute();
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <Icon size={12} className={isSelected ? 'text-white' : r.color} />
                            <span>{t(r.labelKey as any)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Holiday Stage (pre / in / post / none) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-700 font-semibold text-[11px]">
                        <Calendar size={13} className="text-amber-500" />
                        <span>{t('holiday_stage_label')}:</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'none', labelKey: 'holiday_stage_none' },
                        { id: 'pre', labelKey: 'holiday_stage_pre' },
                        { id: 'in', labelKey: 'holiday_stage_in' },
                        { id: 'post', labelKey: 'holiday_stage_post' }
                      ].map(h => {
                        const isSelected = holidayStage === h.id;
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              setHolidayStage(h.id as any);
                              if (isOptimized) handleOptimizeRoute();
                            }}
                            className={`px-1 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                              isSelected 
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {t(h.labelKey as any)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Route Inputs */}
      <div className="flex-1 overflow-y-auto p-3.5 bg-gray-50/50">
        <div className="relative pl-7 space-y-3.5">
          {/* Vertical Route Connecting Line */}
          <div className="absolute left-3 top-5 bottom-6 w-0.5 bg-gray-300 border-l-2 border-dotted border-gray-400"></div>

          {currentWaypoints.map((wp, idx) => {
            const isStart = wp.type === 'start';
            const destIndex = isStart ? 0 : (wp.stopIndex !== undefined && wp.stopIndex !== null && wp.stopIndex > 0 ? wp.stopIndex : currentWaypoints.filter(w => w.type === 'dest').indexOf(wp) + 1);
            const destinationsCount = currentWaypoints.filter(w => w.type === 'dest').length;
            const waypointTag = isStart ? t('start_point') : `${t('destination_point')} ${destIndex}`;
            const hasPrediction = wp.predictionState === 'ready' && Number.isFinite(wp.predictedPeople);
            const isLstmPrediction = String(wp.predictionSource || '').startsWith('lstm_');
            const isChinese = lang === 'zh-CN' || lang === 'zh-TW';
            const lstmMode = wp.predictionSource === 'lstm_historical_one_step'
              ? (isChinese ? '历史回放' : lang === 'pt' ? 'histórico' : 'historical')
              : wp.predictionSource === 'lstm_live_recursive'
                ? (isChinese ? '递推预测' : lang === 'pt' ? 'recursivo' : 'recursive')
                : (isChinese ? '实时预测' : lang === 'pt' ? 'ao vivo' : 'live');
            const predictionSourceLabel = isLstmPrediction
              ? `LSTM ${lstmMode}${wp.predictionRegionId ? ` · ${isChinese ? '片区' : lang === 'pt' ? 'zona' : 'area'} ${wp.predictionRegionId}` : ''}`
              : (lang === 'zh-CN' || lang === 'zh-TW' ? '估算' : lang === 'pt' ? 'Estimativa' : 'Estimate');
            const crowdPreview = !isOptimized && (
              <div
                className="ml-auto flex flex-col items-end gap-0.5 text-right text-[10px] leading-snug"
                aria-live="polite"
                data-testid={`route-crowd-${wp.id}`}
              >
                <span className="text-gray-500 font-medium">
                  {hasPrediction && <span className="font-mono mr-1">{isStart ? startTime : wp.arrivalTime}</span>}
                  {t('predicted_crowd')}
                </span>
                {wp.predictionState === 'loading' ? (
                  <span className="inline-flex items-center gap-1 text-indigo-600">
                    <Loader2 size={11} className="animate-spin" />{t('prediction_loading')}
                  </span>
                ) : hasPrediction ? (
                  <>
                    <span
                      className={`inline-flex flex-wrap justify-end items-center gap-x-1.5 rounded-md px-1.5 py-0.5 font-bold ${wp.color}`}
                      style={{ backgroundColor: wp.statusBg }}
                      title={isLstmPrediction ? wp.predictionRegionName : undefined}
                    >
                      <span>~{Math.round(wp.predictedPeople).toLocaleString()} {t('visitors_unit')}</span>
                      <span>{wp.crowdStatus}</span>
                    </span>
                    <span className="text-[9px] text-gray-400">{predictionSourceLabel}</span>
                  </>
                ) : (
                  <span className="text-gray-400">{t('data_unavailable')}</span>
                )}
              </div>
            );

            return (
              <React.Fragment key={wp.id}>
                {/* Travel duration between waypoints */}
                {idx > 0 && isOptimized && (
                  <div className="relative -my-1 py-0.5 flex items-center gap-1.5 pl-1 z-10">
                    <div className="bg-white/95 border border-indigo-200 text-indigo-800 rounded-full px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1.5 shadow-2xs">
                      <span>{transportMode === 'walk' ? '🚶' : transportMode === 'bike' ? '🚲' : transportMode === 'car' ? '🚗' : '🚌'}</span>
                      <span>{t('travel_time_prefix')} <strong>{wp.travelMinutesFromPrev || 10}</strong> min</span>
                    </div>
                  </div>
                )}

                <div className="relative flex items-center gap-3">
                  {/* Node Pin Indicator */}
                  <div className="absolute -left-7 flex items-center justify-center bg-gray-50">
                    {isStart ? (
                      <div className="w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-600 flex items-center justify-center shadow-xs">
                        <MapPin size={10} className="text-indigo-600 fill-indigo-600" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center shadow-xs">
                        <MapPin size={10} className="text-red-600 fill-red-600" />
                      </div>
                    )}
                  </div>

                  {/* Waypoint Card */}
                  <div className={`flex-1 bg-white border ${
                    isOptimized ? 'border-emerald-200 shadow-emerald-50/40' : 'border-gray-200'
                  } rounded-xl p-2.5 shadow-xs flex flex-col gap-2 group hover:border-indigo-300 transition-all`}>
                    
                    {/* Header / Type & Time Tag */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isStart ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex items-center gap-1">
                            <span>{waypointTag}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                                <span>{waypointTag}</span>
                            </span>
                            {isOptimized && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {wp.predictedPeople !== undefined && wp.predictedPeople !== null && (
                                  <span className="text-[10px] text-gray-600 font-semibold bg-gray-100 px-1.5 py-0.5 rounded" title={isLstmPrediction ? wp.predictionRegionName : predictionSourceLabel}>
                                    ~{wp.predictedPeople.toLocaleString()} {t('visitors_unit')} · {predictionSourceLabel}
                                  </span>
                                )}
                                {wp.crowdStatus && (
                                  <span 
                                    className="text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs border"
                                    style={{ 
                                      backgroundColor: wp.statusBg || '#ecfdf5',
                                      color: wp.colorHex || '#10b981',
                                      borderColor: `${wp.colorHex || '#10b981'}33`
                                    }}
                                  >
                                    {wp.crowdStatus}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Switch between catalog and custom input */}
                        {!isOptimized && !isStart && (
                          <button
                            onClick={() => handleToggleCustomMode(wp.id, !wp.isCustom)}
                            className="w-7 h-7 rounded border transition-colors flex items-center justify-center bg-gray-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                            title={wp.isCustom ? t('list_mode') : t('custom_mode')}
                          >
                            {wp.isCustom ? (
                              <List size={13} />
                            ) : (
                              <Edit3 size={13} />
                            )}
                          </button>
                        )}

                        {/* Header Time Display: optimized start departure / destination arrival-departure */}
                        {isStart && isOptimized ? (
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                            <Clock size={11} className="text-emerald-600 shrink-0" />
                            <span>{startTime}</span>
                          </div>
                        ) : isOptimized && wp.arrivalTime ? (
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                            <Clock size={11} className="text-emerald-600 shrink-0" />
                            <span>{wp.arrivalTime} ➔ {wp.departureTime}</span>
                          </div>
                        ) : wp.time ? (
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            isOptimized ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {wp.time}
                          </span>
                        ) : null}

                        {!isOptimized && !isStart && destinationsCount > 1 && (
                          <button
                            onClick={() => handleDeleteDestination(wp.id)}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                            title={t('delete_dest')}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Location Selector (or Name if optimized) */}
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white rounded px-1.5 py-0.5 text-[10px] font-extrabold font-mono shrink-0 shadow-2xs flex items-center justify-center min-w-[18px]">
                        {isStart ? 'S' : destIndex}
                      </span>
                      <div className="flex-1 min-w-0">
                        {isOptimized ? (
                          <div className="text-xs font-bold text-gray-800 break-words leading-tight py-0.5">
                            {wp.name}
                          </div>
                        ) : wp.isCustom ? (
                          <div className="space-y-1">
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={wp.customName || ''}
                                onChange={(e) => handleSetCustomLocation(wp.id, e.target.value)}
                                placeholder={t('custom_input_placeholder')}
                                className="w-full bg-white border border-indigo-300 focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 outline-none pr-7 shadow-2xs focus:ring-2 focus:ring-indigo-100"
                              />
                              <Edit3 size={12} className="absolute right-2.5 text-indigo-500 pointer-events-none" />
                            </div>
                            {wp.matchedPoiName && wp.customName !== wp.matchedPoiName && (
                              <button
                                type="button"
                                onClick={() => {
                                  const matched = MACAU_POIS.find(p => t(p.nameKey as any) === wp.matchedPoiName);
                                  if (matched) {
                                    handleSelectPoi(wp.id, matched.id);
                                  }
                                }}
                                className="w-full mt-1.5 text-left bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-indigo-100/80 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                              >
                                <span>🎯 {wp.matchedPoiName}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={wp.poiId || ''}
                              onChange={(e) => handleSelectPoi(wp.id, e.target.value)}
                              className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-indigo-400 text-xs font-semibold text-gray-800 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer pr-7 transition-all"
                            >
                              <optgroup label={t('group_heritage')}>
                                {MACAU_POIS.filter(p => p.category === 'heritage').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <optgroup label={t('group_hotels')}>
                                {MACAU_POIS.filter(p => p.category === 'resort' || p.category === 'hotel').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <optgroup label={t('group_landmarks')}>
                                {MACAU_POIS.filter(p => p.category === 'landmark' || p.category === 'nature').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <optgroup label={t('group_food')}>
                                {MACAU_POIS.filter(p => p.category === 'food').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <optgroup label={t('group_cafes')}>
                                {MACAU_POIS.filter(p => p.category === 'cafe').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <optgroup label={t('group_shopping')}>
                                {MACAU_POIS.filter(p => p.category === 'shopping').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <optgroup label={t('group_campus')}>
                                {MACAU_POIS.filter(p => p.category === 'campus').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <optgroup label={t('group_ports')}>
                                {MACAU_POIS.filter(p => p.category === 'port').map(p => (
                                  <option key={p.id} value={p.id}>{t(p.nameKey as any)}</option>
                                ))}
                              </optgroup>
                              <option value="__custom__">✏️ {t('manual_custom')}</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Start Point: Departure Time input with live Beijing time sync */}
                    {isStart && (
                      <div className="flex items-end justify-between flex-wrap gap-2 pt-1.5 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <Clock size={12} className="text-gray-400 shrink-0" />
                          <span className="text-[10px] text-gray-500 font-medium">{t('departure_time')}:</span>
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => {
                              setStartTime(e.target.value);
                              setIsOptimized(false);
                            }}
                            className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs font-bold text-gray-800 outline-none focus:border-indigo-400"
                          />
                        </div>
                        {crowdPreview}
                      </div>
                    )}

                    {/* Destination: Duration & Crowd info */}
                    {!isStart && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[10px] gap-2 flex-wrap sm:flex-nowrap">
                        {/* Duration editor */}
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600 shadow-2xs whitespace-nowrap" title={t('visit_duration')}>
                          <Clock size={11} className="shrink-0 text-indigo-600 mr-1.5" />
                          <span className="text-[10px] text-gray-500 mr-1 font-medium">{t('visit_duration')}:</span>
                          {isOptimized ? (
                            <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[11px] font-bold text-indigo-700">
                              {wp.durationMinutes || waypointDurations[wp.id] || 60} min
                            </span>
                          ) : (
                            <input 
                              type="number" 
                              min="10"
                              max="480"
                              step="10"
                              value={waypointDurations[wp.id] || 60} 
                              onChange={(e) => setWaypointDurations(prev => ({ ...prev, [wp.id]: parseInt(e.target.value) || 0 }))}
                              className="bg-white border border-gray-300 focus:border-indigo-500 outline-none text-[11px] font-bold text-indigo-700 w-12 text-center rounded py-0.5 px-1 shadow-2xs"
                            />
                          )}
                          {!isOptimized && <span className="ml-1 text-[10px] text-gray-500 font-semibold">min</span>}
                        </div>

                        {crowdPreview}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Add Destination Button (Always visible so users can append at any time) */}
          <div className="relative flex items-center gap-3 pt-1">
            <div className="absolute -left-7 flex items-center justify-center bg-gray-50">
              <Plus size={15} className="text-indigo-500" />
            </div>
            <button 
              onClick={handleAddDestination}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>{t('add_dest')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-3 bg-white border-t border-gray-100 shrink-0">
        {hasPendingManualSort && (
          <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-800">
            {t('pending_order_notice')}
          </div>
        )}
        {isOptimized ? (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsOptimized(false)} 
              className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              {t('edit')}
            </button>
            {hasPendingManualSort && onConfirmManualSort && (
              <button
                onClick={onConfirmManualSort}
                disabled={isCalculatingRoute}
                className="px-3 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-xl transition-colors cursor-pointer"
              >
                {t('confirm_order')}
              </button>
            )}
            <button 
              onClick={() => {
                if (onStartNavigation) {
                  onStartNavigation();
                } else if (onNavigateToMap) {
                  onNavigateToMap();
                }
              }}
              disabled={Boolean(hasPendingManualSort) || isCalculatingRoute}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-2.5 px-3 rounded-xl shadow-xs shadow-emerald-200 flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer active:scale-98 disabled:cursor-not-allowed"
            >
              <Navigation size={15} className="shrink-0" />
              <span className="truncate">{t('start_nav')}</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {hasPendingManualSort && onConfirmManualSort && (
              <button
                onClick={onConfirmManualSort}
                disabled={isCalculatingRoute}
                className="px-3 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 rounded-xl transition-colors cursor-pointer"
              >
                {t('confirm_order')}
              </button>
            )}
            <button 
              onClick={() => handleOptimizeRoute()}
              disabled={isCalculatingRoute}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 px-3 rounded-xl shadow-xs shadow-indigo-200 flex items-center justify-center gap-2 transition-all text-xs cursor-pointer"
            >
              {isCalculatingRoute ? (
                <>
                  <Loader2 size={16} className="shrink-0 animate-spin" />
                  <span className="truncate">{t('optimizing')}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="shrink-0" />
                  <span className="truncate">{t('start_smart_planning')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
