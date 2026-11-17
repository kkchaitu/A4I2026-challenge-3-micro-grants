import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Layers, 
  AlertOctagon, 
  Sparkles, 
  Key, 
  Eye, 
  Navigation, 
  Check, 
  Compass, 
  FileText, 
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info
} from 'lucide-react';
import { calculateDownstreamExposure } from '../utils/graphCalculations';

export function GoogleMapView({
  corridor,
  selectedBusinessId,
  onSelectBusiness,
  onGenerateMemo
}) {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gmaps_api_key') || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey);
  const [mapType, setMapType] = useState('dark'); // 'dark', 'satellite', 'streets'
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [selectedDepth, setSelectedDepth] = useState(2);
  const [edgeFilter, setEdgeFilter] = useState('all');
  const [hoveredBusiness, setHoveredBusiness] = useState(null);

  // Fallback interactive map pan/zoom state
  const [zoomLevel, setZoomLevel] = useState(corridor.zoom || 16);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);

  const activeSeedId = selectedBusinessId || corridor.businesses[0].id;
  const seedBusiness = corridor.businesses.find(b => b.id === activeSeedId) || corridor.businesses[0];
  const exposure = calculateDownstreamExposure(activeSeedId, corridor, selectedDepth);

  // Save API key
  const handleSaveApiKey = () => {
    const trimmed = inputKey.trim();
    setApiKey(trimmed);
    localStorage.setItem('gmaps_api_key', trimmed);
    setShowKeyModal(false);
  };

  // Check if Google Maps JS API script is loaded
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      setIsGoogleMapsReady(false);
      return;
    }

    if (window.google && window.google.maps) {
      setIsGoogleMapsReady(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsGoogleMapsReady(true);
      };
      script.onerror = () => {
        console.warn('Failed to load Google Maps with provided key, using interactive spatial canvas fallback');
        setIsGoogleMapsReady(false);
      };
      document.head.appendChild(script);
    } else {
      setIsGoogleMapsReady(true);
    }
  }, [apiKey]);

  // Native Google Maps Initialization when isGoogleMapsReady is true
  useEffect(() => {
    if (!isGoogleMapsReady || !mapContainerRef.current || !window.google?.maps) return;

    // Night/Aubergine styling
    const darkStyle = [
      { elementType: 'geometry', stylers: [{ color: '#17202a' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#17202a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1c2833' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3e50' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212f3d' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1621' }] },
    ];

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: corridor.center,
      zoom: corridor.zoom || 16,
      styles: mapType === 'dark' ? darkStyle : undefined,
      mapTypeId: mapType === 'satellite' ? 'satellite' : 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    googleMapInstanceRef.current = map;

    // Clear previous markers & polylines
    markersRef.current.forEach(m => m.setMap(null));
    polylinesRef.current.forEach(p => p.setMap(null));
    markersRef.current = [];
    polylinesRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    // 1. Plot Employer Blocks
    corridor.employerBlocks.forEach(emp => {
      const pos = { lat: emp.lat, lng: emp.lng };
      bounds.extend(pos);

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: emp.label,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#db2777',
          fillOpacity: 0.9,
          strokeColor: '#fbcfe8',
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
            <strong style="font-size: 13px;">🏢 ${emp.label}</strong>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
              Worker Count: <strong>${emp.workerCount.toLocaleString()} workers</strong>
            </p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // 2. Plot Businesses
    corridor.businesses.forEach(b => {
      const pos = { lat: b.lat, lng: b.lng };
      bounds.extend(pos);

      const isSeed = b.id === activeSeedId;
      const isDownstream = exposure.downstreamList.some(d => d.business.id === b.id);
      const isShocked = isSimulatingFailure && (isSeed || isDownstream);

      let pinColor = '#3b82f6'; // Blue
      if (isShocked) pinColor = '#f43f5e'; // Red
      else if (isSeed) pinColor = '#2563eb';
      else if (isDownstream) pinColor = '#6366f1'; // Indigo
      else if (b.role.includes('Leaf')) pinColor = '#64748b'; // Slate

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: b.name,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: isSeed ? 8 : 6,
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: isSeed ? '#ffffff' : '#1e293b',
          strokeWeight: isSeed ? 2.5 : 1.5,
        },
        zIndex: isSeed ? 999 : isDownstream ? 500 : 100,
      });

      const infoContent = `
        <div style="color: #0f172a; font-family: sans-serif; padding: 6px; max-width: 240px;">
          <div style="font-size: 10px; font-weight: bold; color: #2563eb; text-transform: uppercase;">${b.role}</div>
          <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${b.dba || b.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${b.address}</div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px; display: flex; justify-content: space-between;">
            <span>Payroll: <strong>${b.jobs} jobs</strong></span>
            <span>Distress: <strong>${b.distressScore.toFixed(2)}</strong></span>
          </div>
          <div style="margin-top: 4px; font-size: 11px; color: #16a34a; font-weight: bold;">
            Grant: $${b.grantRequested.toLocaleString()}
          </div>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

      marker.addListener('click', () => {
        onSelectBusiness(b.id);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // 3. Plot Cascade Polylines (Supplies, Footfall, Loans)
    corridor.edges.forEach(edge => {
      if (edgeFilter === 'supplies' && edge.type !== 'Supplies') return;
      if (edgeFilter === 'footfall' && edge.type !== 'DrawsFootfall') return;

      const sourceBiz = corridor.businesses.find(b => b.id === edge.source);
      const sourceEmp = corridor.employerBlocks.find(e => e.id === edge.source);
      const targetBiz = corridor.businesses.find(b => b.id === edge.target);

      const sPos = sourceBiz ? { lat: sourceBiz.lat, lng: sourceBiz.lng } : sourceEmp ? { lat: sourceEmp.lat, lng: sourceEmp.lng } : null;
      const tPos = targetBiz ? { lat: targetBiz.lat, lng: targetBiz.lng } : null;

      if (!sPos || !tPos) return;

      const isSeedConnected = edge.source === activeSeedId || edge.target === activeSeedId;
      const isDownstreamEdge = exposure.paths.some(p => p.sourceId === edge.source && p.targetId === edge.target);
      const isShocked = isSimulatingFailure && (edge.source === activeSeedId || isDownstreamEdge);

      let strokeColor = '#3b82f6';
      let strokeOpacity = 0.7;
      let strokeWeight = (edge.intensity || 0.5) * 4;

      if (edge.type === 'DrawsFootfall') {
        strokeColor = '#ec4899';
        strokeWeight = 2;
      } else if (edge.type === 'BorrowedFrom') {
        strokeColor = '#f59e0b';
        strokeWeight = 2.5;
      }

      if (isShocked) {
        strokeColor = '#f43f5e';
        strokeWeight = Math.max(3, strokeWeight);
        strokeOpacity = 0.95;
      }

      const polyline = new window.google.maps.Polyline({
        path: [sPos, tPos],
        geodesic: true,
        strokeColor,
        strokeOpacity,
        strokeWeight,
        map,
        icons: edge.type === 'Supplies' ? [{
          icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, fillColor: strokeColor, fillOpacity: 1 },
          offset: '60%'
        }] : undefined,
      });

      polylinesRef.current.push(polyline);
    });

    // Center map
    map.setCenter(corridor.center);

  }, [isGoogleMapsReady, corridor, activeSeedId, selectedDepth, edgeFilter, isSimulatingFailure, mapType]);

  // Spatial Projection Math for Interactive Built-In Spatial Canvas
  // Maps real lat/long to container SVG coordinates centered on corridor
  const canvasWidth = 860;
  const canvasHeight = 540;

  const latLngToPoint = (lat, lng) => {
    const centerLat = corridor.center.lat;
    const centerLng = corridor.center.lng;
    
    // Scale factor tuned for zoom 16 in San Francisco
    const scale = Math.pow(2, zoomLevel) * 22;
    const x = canvasWidth / 2 + (lng - centerLng) * scale * Math.cos(centerLat * Math.PI / 180) + panOffset.x;
    const y = canvasHeight / 2 - (lat - centerLat) * scale + panOffset.y;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetMapPosition = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(corridor.zoom || 16);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Left: Seed Selector & Status */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                Geospatial Cascade Network Map
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                {isGoogleMapsReady ? 'Google Maps JS SDK Active' : 'San Francisco Cadastral GIS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Physical street location of suppliers, buyers, and employer footfall blocks on {corridor.name}
            </p>
          </div>
        </div>

        {/* Right: Map Actions, Depth, Failure simulation, API Key */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Seed selector */}
          <select
            value={activeSeedId}
            onChange={(e) => onSelectBusiness(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {corridor.businesses.map(b => (
              <option key={b.id} value={b.id}>
                Seed: {b.dba || b.name} ({b.jobs} jobs)
              </option>
            ))}
          </select>

          {/* Hop Depth */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {[1, 2, 3].map(d => (
              <button
                key={d}
                onClick={() => setSelectedDepth(d)}
                className={`px-2 py-1 rounded-lg font-mono font-semibold transition ${
                  selectedDepth === d ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d} Hop{d > 1 ? 's' : ''}
              </button>
            ))}
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMapType('dark')}
              className={`px-2 py-1 rounded-lg font-medium transition ${
                mapType === 'dark' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
              }`}
            >
              Night
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2 py-1 rounded-lg font-medium transition ${
                mapType === 'satellite' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Failure Simulation */}
          <button
            onClick={() => setIsSimulatingFailure(!isSimulatingFailure)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
              isSimulatingFailure
                ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{isSimulatingFailure ? 'Closure Active' : 'Simulate Shock'}</span>
          </button>

          {/* Google Maps API Key Config */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            title="Configure Google Maps API Key"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>{apiKey ? 'API Key Set' : 'Set Maps Key'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Google Map View + Geospatial Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Map Container */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[580px] flex flex-col justify-between">
          {/* Top Floating Map Controls */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-200 pointer-events-auto flex items-center gap-2 shadow-lg">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-slate-100">{corridor.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-[11px] font-mono text-blue-400">
                Lat {corridor.center.lat.toFixed(4)}, Lng {corridor.center.lng.toFixed(4)}
              </span>
            </div>

            {/* Downstream protected badge */}
            <div className="bg-indigo-950/90 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs text-indigo-200 pointer-events-auto shadow-lg flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{exposure.reachedCount} Downstream Buyers Mapped</span>
            </div>
          </div>

          {/* Floating Failure Warning if active */}
          {isSimulatingFailure && (
            <div className="absolute top-16 left-4 right-4 z-20 bg-rose-950/90 border border-rose-500/60 p-3 rounded-2xl text-xs text-rose-100 flex items-center justify-between shadow-2xl backdrop-blur animate-pulse">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  <strong>GEOSPATIAL SUPPLY SHUTDOWN:</strong> <strong>{seedBusiness.name}</strong> ({seedBusiness.address}) has halted operations. Red lines indicate <strong>{exposure.reachedCount} dependent commercial storefronts</strong> facing emergency supply severance.
                </span>
              </div>
            </div>
          )}

          {/* Map Layer: Either Native Google Maps SDK or Interactive Spatial Canvas */}
          {isGoogleMapsReady ? (
            <div ref={mapContainerRef} className="w-full h-[580px]" />
          ) : (
            <div
              className={`w-full h-[580px] relative select-none overflow-hidden ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Dark Styled Municipal Grid Background */}
              <div 
                className="absolute inset-0 bg-[#090d16] opacity-95 pointer-events-none"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 50% 50%, rgba(30, 58, 138, 0.15) 0%, transparent 80%),
                    linear-gradient(to right, rgba(30, 41, 59, 0.4) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(30, 41, 59, 0.4) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 36px 36px, 36px 36px',
                }}
              />

              {/* San Francisco Major Street Axis Indicators */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Market Street Diagonal Corridor Axis */}
                <line
                  x1={canvasWidth * 0.1}
                  y1={canvasHeight * 0.75}
                  x2={canvasWidth * 0.9}
                  y2={canvasHeight * 0.25}
                  stroke="#334155"
                  strokeWidth="8"
                  strokeOpacity="0.4"
                />
                <text
                  x={canvasWidth * 0.5}
                  y={canvasHeight * 0.48}
                  fill="#64748b"
                  fontSize="12"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  transform="rotate(-26, 430, 260)"
                  letterSpacing="6"
                  opacity="0.6"
                >
                  MARKET STREET COMMERCIAL CORRIDOR
                </text>
              </svg>

              {/* Interactive SVG Overlays for Markers and Polylines */}
              <svg className="absolute inset-0 w-full h-full">
                <defs>
                  {/* Arrow markers */}
                  <marker
                    id="geo-arrow-blue"
                    viewBox="0 0 10 10"
                    refX="16"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                  </marker>
                  <marker
                    id="geo-arrow-red"
                    viewBox="0 0 10 10"
                    refX="16"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                  </marker>
                  <marker
                    id="geo-arrow-pink"
                    viewBox="0 0 10 10"
                    refX="16"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#ec4899" />
                  </marker>
                </defs>

                {/* Render Cascade Polylines */}
                {corridor.edges.map(edge => {
                  if (edgeFilter === 'supplies' && edge.type !== 'Supplies') return null;
                  if (edgeFilter === 'footfall' && edge.type !== 'DrawsFootfall') return null;

                  const sourceBiz = corridor.businesses.find(b => b.id === edge.source);
                  const sourceEmp = corridor.employerBlocks.find(e => e.id === edge.source);
                  const targetBiz = corridor.businesses.find(b => b.id === edge.target);

                  const sLat = sourceBiz ? sourceBiz.lat : sourceEmp ? sourceEmp.lat : null;
                  const sLng = sourceBiz ? sourceBiz.lng : sourceEmp ? sourceEmp.lng : null;
                  const tLat = targetBiz ? targetBiz.lat : null;
                  const tLng = targetBiz ? targetBiz.lng : null;

                  if (sLat === null || tLat === null) return null;

                  const p1 = latLngToPoint(sLat, sLng);
                  const p2 = latLngToPoint(tLat, tLng);

                  const isSeedConnected = edge.source === activeSeedId || edge.target === activeSeedId;
                  const isDownstreamEdge = exposure.paths.some(p => p.sourceId === edge.source && p.targetId === edge.target);
                  const isShocked = isSimulatingFailure && (edge.source === activeSeedId || isDownstreamEdge);

                  let strokeColor = '#3b82f6';
                  let strokeWidth = (edge.intensity || 0.5) * 4;
                  let strokeDash = undefined;
                  let markerEnd = 'url(#geo-arrow-blue)';

                  if (edge.type === 'DrawsFootfall') {
                    strokeColor = '#ec4899';
                    strokeDash = '4,4';
                    strokeWidth = 2;
                    markerEnd = 'url(#geo-arrow-pink)';
                  } else if (edge.type === 'BorrowedFrom') {
                    strokeColor = '#f59e0b';
                    strokeWidth = 2.5;
                  }

                  if (isShocked) {
                    strokeColor = '#f43f5e';
                    strokeWidth = Math.max(3.5, strokeWidth);
                    markerEnd = 'url(#geo-arrow-red)';
                  }

                  // Midpoint for curved path
                  const midX = (p1.x + p2.x) / 2;
                  const midY = (p1.y + p2.y) / 2;
                  // slight curve
                  const dx = p2.x - p1.x;
                  const dy = p2.y - p1.y;
                  const cx = midX - dy * 0.12;
                  const cy = midY + dx * 0.12;

                  return (
                    <g key={edge.id} className="transition-all">
                      <path
                        d={`M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDash}
                        markerEnd={markerEnd}
                        className={isShocked ? 'animate-pulse' : ''}
                      />
                      {edge.type === 'Supplies' && (
                        <text
                          x={cx}
                          y={cy - 5}
                          fill={isShocked ? '#fda4af' : '#93c5fd'}
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {(edge.intensity).toFixed(2)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Render Employer Blocks */}
                {corridor.employerBlocks.map(emp => {
                  const pt = latLngToPoint(emp.lat, emp.lng);
                  return (
                    <g key={emp.id} transform={`translate(${pt.x}, ${pt.y})`} className="cursor-pointer">
                      <rect
                        x="-65"
                        y="-22"
                        width="130"
                        height="44"
                        rx="12"
                        fill="#831843"
                        stroke="#f472b6"
                        strokeWidth="2"
                        className="hover:brightness-125 transition shadow-lg"
                      />
                      <text x="0" y="-3" fill="#fdf2f8" fontSize="10" fontWeight="bold" textAnchor="middle">
                        🏢 {emp.label.split(' ')[0]} {emp.label.split(' ')[1]}
                      </text>
                      <text x="0" y="13" fill="#fbcfe8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                        {emp.workerCount.toLocaleString()} workers
                      </text>
                    </g>
                  );
                })}

                {/* Render Businesses Markers */}
                {corridor.businesses.map(b => {
                  const pt = latLngToPoint(b.lat, b.lng);
                  const isSeed = b.id === activeSeedId;
                  const isDownstream = exposure.downstreamList.some(d => d.business.id === b.id);
                  const isShocked = isSimulatingFailure && (isSeed || isDownstream);

                  let pinFill = '#1e3a8a';
                  let pinStroke = '#3b82f6';
                  let textFill = '#e2e8f0';

                  if (isSeed) {
                    pinFill = isShocked ? '#881337' : '#2563eb';
                    pinStroke = isShocked ? '#f43f5e' : '#93c5fd';
                    textFill = '#ffffff';
                  } else if (isDownstream) {
                    pinFill = isShocked ? '#4c0519' : '#312e81';
                    pinStroke = isShocked ? '#fb7185' : '#818cf8';
                    textFill = '#e0e7ff';
                  } else if (b.role.includes('Leaf')) {
                    pinFill = '#0f172a';
                    pinStroke = '#475569';
                    textFill = '#94a3b8';
                  }

                  return (
                    <g
                      key={b.id}
                      transform={`translate(${pt.x}, ${pt.y})`}
                      onClick={() => onSelectBusiness(b.id)}
                      onMouseEnter={() => setHoveredBusiness(b)}
                      onMouseLeave={() => setHoveredBusiness(null)}
                      className="cursor-pointer group"
                    >
                      {/* Pulsing ring for active seed */}
                      {isSeed && (
                        <circle
                          r="32"
                          fill="none"
                          stroke={isShocked ? '#f43f5e' : '#3b82f6'}
                          strokeWidth="2"
                          opacity="0.4"
                          className="animate-ping"
                        />
                      )}

                      {/* Map Pin Marker */}
                      <path
                        d="M 0 0 C -12 -12, -16 -24, 0 -36 C 16 -24, 12 -12, 0 0 Z"
                        fill={pinFill}
                        stroke={pinStroke}
                        strokeWidth={isSeed ? 2.5 : 1.5}
                        className="group-hover:scale-110 transition-transform origin-bottom"
                      />

                      <circle cx="0" cy="-24" r="5" fill="#ffffff" />

                      {/* Business Label Tag */}
                      <rect
                        x="-55"
                        y="6"
                        width="110"
                        height="20"
                        rx="6"
                        fill="#090d16"
                        stroke={pinStroke}
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      <text
                        x="0"
                        y="19"
                        fill={textFill}
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {b.dba || b.name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredBusiness && (
                <div
                  className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs max-w-xs"
                  style={{
                    left: `${Math.min(canvasWidth - 220, Math.max(20, latLngToPoint(hoveredBusiness.lat, hoveredBusiness.lng).x - 100))}px`,
                    top: `${Math.max(20, latLngToPoint(hoveredBusiness.lat, hoveredBusiness.lng).y - 110)}px`
                  }}
                >
                  <div className="font-bold text-slate-100">{hoveredBusiness.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{hoveredBusiness.address}</div>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                    <span className="text-blue-400 font-semibold">{hoveredBusiness.jobs} payroll jobs</span>
                    <span className="text-amber-400 font-mono">dist {hoveredBusiness.distressScore.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Floating Map Zoom & Center Controls */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Keystone Hub
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Downstream Buyer
              </span>
              <span className="flex items-center gap-1.5 text-pink-400">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" /> Employer Block
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 19))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 14))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetMapPosition}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] transition"
              >
                Recenter Corridor
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Geospatial Location Inspector */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase font-bold">
                  {seedBusiness.role}
                </span>
                <h3 className="font-bold text-base text-slate-100 mt-1">
                  {seedBusiness.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{seedBusiness.address}</p>
              </div>
            </div>

            {/* Coordinates Badge */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-slate-400 text-[10px]">REGISTERED LOCATION ID (TTXID):</div>
              <div className="text-blue-300 font-semibold">{seedBusiness.id.toUpperCase()}-SF-94103</div>
              <div className="text-slate-500 text-[11px]">
                Latitude: {seedBusiness.lat} • Longitude: {seedBusiness.lng}
              </div>
            </div>

            {/* Geospatial Exposure Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DIRECT STOREFRONT</span>
                <span className="text-base font-bold text-slate-100">{seedBusiness.jobs} jobs</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DOWNSTREAM REACH</span>
                <span className="text-base font-bold text-indigo-400">+{exposure.totalDownstreamJobs} jobs</span>
              </div>
            </div>

            {/* Nearby Spatial Linkages */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Nearby Connected Dependents:</span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  {exposure.reachedCount} Establishments
                </span>
              </h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {exposure.downstreamList.map(d => (
                  <div
                    key={d.business.id}
                    onClick={() => onSelectBusiness(d.business.id)}
                    className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{d.business.dba || d.business.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {d.business.address} ({d.minDepth}-Hop)
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-400 font-bold">{d.business.jobs} jobs</span>
                      <div className="text-[9px] text-slate-500 font-mono">
                        int {(d.cumulativeIntensity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action button to generate memo */}
            <button
              onClick={() => onGenerateMemo(seedBusiness.id)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Generate Official Grant Memo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Google Maps API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Google Maps JavaScript API Key</h3>
                <p className="text-xs text-slate-400">Enter your Google Cloud project API key to activate full native Maps SDK</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When an API key is provided, the corridor map switches from the built-in cadastral canvas to Google Maps with Street View, satellite imagery, and geodetic vectors.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">GOOGLE MAPS API KEY:</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
              >
                Apply Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
