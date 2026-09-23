import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Pole, PowerLine } from '../types';
import { STATUS_COLOR, STATUS_LABEL, type VisueltStatusNivaa } from '../statusUtils';

// ---------------------------------------------------------------------------
// Kartbasert visning av stolper og strekk, på et ekte kart (OpenStreetMap).
// Stolper og strekk er separate, klikkbare objekter. Valgt stolpe/strekk
// markeres tydelig, og status vises både som farge og som lesbar tekst
// (se STATUS_LABEL / map-legend under kartet).
// ---------------------------------------------------------------------------

function poleIcon(color: string, number: number, opts: { selected?: boolean; multiSelected?: boolean } = {}) {
  const size = opts.selected || opts.multiSelected ? 30 : 26;
  const ringColor = opts.multiSelected ? '#205081' : 'rgba(255,255,255,0.95)';
  const ringWidth = opts.selected || opts.multiSelected ? 3 : 2;
  const badge = opts.multiSelected
    ? `<div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);background:#205081;color:white;font-size:10px;font-weight:700;padding:1px 5px;border-radius:8px;white-space:nowrap;">✓ valgt</div>`
    : '';
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      ${badge}
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        border:${ringWidth}px solid ${ringColor};
        box-shadow:0 1px 4px rgba(0,0,0,0.45);
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:700;font-size:${size >= 30 ? 12 : 11}px;
        font-family:inherit;
      ">${number}</div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'pole-divicon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function boundsFor(poles: Pole[]) {
  return L.latLngBounds(poles.map((p) => [p.lat, p.lon] as [number, number]));
}

function ClickForPlacement({ placementMode, onPlacePole }: { placementMode?: boolean; onPlacePole?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (placementMode && onPlacePole) onPlacePole(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapView({
  poles,
  lines,
  getPoleStatus,
  getLineStatus,
  selectedPoleId,
  selectedLineId,
  onSelectPole,
  onSelectLine,
  selectedPoleIds,
  onTogglePole,
  selectMode,
  selectedLineIds,
  onToggleLine,
  lineSelectMode,
  getLineLabel,
  height = 460,
  placementMode,
  onPlacePole,
}: {
  poles: Pole[];
  lines: PowerLine[];
  getPoleStatus: (pole: Pole) => VisueltStatusNivaa;
  getLineStatus: (line: PowerLine) => VisueltStatusNivaa;
  selectedPoleId?: string;
  selectedLineId?: string;
  onSelectPole?: (poleId: string) => void;
  onSelectLine?: (lineId: string) => void;
  selectedPoleIds?: Set<string>;
  onTogglePole?: (poleId: string) => void;
  selectMode?: boolean;
  /** Sett for å merke flere strekk samtidig, f.eks. for å registrere én kabel over flere stolpestrekk. */
  selectedLineIds?: Set<string>;
  onToggleLine?: (lineId: string) => void;
  lineSelectMode?: boolean;
  /** Valgfri, kort tekst vist permanent langs strekket (f.eks. antall kabler før/etter og målt høyde). */
  getLineLabel?: (line: PowerLine) => string | null | undefined;
  height?: number;
  dimUnselectable?: boolean;
  placementMode?: boolean;
  onPlacePole?: (lat: number, lon: number) => void;
}) {
  const poleById = useMemo(() => new Map(poles.map((p) => [p.id, p])), [poles]);
  const mapRef = useRef<L.Map | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Kartet har en fast pikselhøyde (Leaflet krever det), så når vi utvider
  // eller vinduet endrer størrelse må Leaflet fortelles at containeren har
  // fått ny størrelse, ellers blir bare en del av kartet tegnet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 50);
    if (!expanded) return () => clearTimeout(t);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = '';
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  const usedStatuses = useMemo(() => {
    const s = new Set<VisueltStatusNivaa>();
    poles.forEach((p) => s.add(getPoleStatus(p)));
    lines.forEach((l) => s.add(getLineStatus(l)));
    return Array.from(s);
  }, [poles, lines, getPoleStatus, getLineStatus]);

  const initialBounds = poles.length > 0 ? boundsFor(poles) : undefined;
  const fallbackCenter: [number, number] = [60.2385, 10.462];

  return (
    <div className={`map-wrap${expanded ? ' map-wrap-expanded' : ''}`}>
      <div className="map-toolbar">
        <div className="hstack faint">
          <span>{poles.length} stolper · {lines.length} strekk</span>
          {selectMode && <span className="pill-role">Klikk stolper for å velge/fjerne</span>}
          {lineSelectMode && <span className="pill-role">Klikk strekk for å velge/fjerne</span>}
          {placementMode && <span className="pill-role">Klikk i kartet for å plassere ny stolpe</span>}
        </div>
        <div className="hstack">
          <button
            className="btn btn-sm"
            onClick={() => {
              if (mapRef.current && poles.length > 0) {
                mapRef.current.fitBounds(boundsFor(poles), { padding: [40, 40] });
              }
            }}
            title="Tilpass kartutsnitt til alle stolpene"
          >
            Tilpass
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Gå ut av fullskjerm (Esc)' : 'Utvid kart til fullskjerm'}
          >
            {expanded ? '✕ Lukk' : '⛶ Utvid'}
          </button>
        </div>
      </div>
      <MapContainer
        bounds={initialBounds}
        center={initialBounds ? undefined : fallbackCenter}
        zoom={initialBounds ? undefined : 15}
        boundsOptions={{ padding: [40, 40] }}
        style={{ width: '100%', height: expanded ? '100%' : height, flex: expanded ? '1 1 auto' : undefined, minHeight: expanded ? 0 : undefined, cursor: placementMode ? 'crosshair' : undefined }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickForPlacement placementMode={placementMode} onPlacePole={onPlacePole} />
        {lines.map((line) => {
          const a = poleById.get(line.poleAId);
          const b = poleById.get(line.poleBId);
          if (!a || !b) return null;
          const status = getLineStatus(line);
          const color = STATUS_COLOR[status];
          const isMultiSelected = !!selectedLineIds?.has(line.id);
          const isSelected = selectedLineId === line.id || isMultiSelected;
          const label = getLineLabel?.(line);
          const positions: [number, number][] = [
            [a.lat, a.lon],
            [b.lat, b.lon],
          ];
          const handleClick = () => {
            if (lineSelectMode && onToggleLine) onToggleLine(line.id);
            else onSelectLine?.(line.id);
          };
          return (
            <div key={line.id}>
              {/* Bred, usynlig linje for enklere klikk-treff */}
              <Polyline
                positions={positions}
                pathOptions={{ color: 'transparent', weight: 18, opacity: 0 }}
                eventHandlers={{ click: handleClick }}
              />
              <Polyline
                positions={positions}
                pathOptions={{
                  color: isMultiSelected ? '#205081' : color,
                  weight: isSelected ? 7 : 4,
                  opacity: 0.95,
                  dashArray: isSelected ? '2 10' : undefined,
                  lineCap: 'round',
                }}
                eventHandlers={{ click: handleClick }}
              >
                {label && (
                  <Tooltip permanent direction="center" opacity={1} className="line-label-tooltip">
                    {label}
                  </Tooltip>
                )}
              </Polyline>
            </div>
          );
        })}
        {poles.map((pole) => {
          const status = getPoleStatus(pole);
          const color = STATUS_COLOR[status];
          const isSelected = selectedPoleId === pole.id;
          const isMultiSelected = selectedPoleIds?.has(pole.id);
          return (
            <Marker
              key={pole.id}
              position={[pole.lat, pole.lon]}
              icon={poleIcon(color, pole.number, { selected: isSelected, multiSelected: isMultiSelected })}
              eventHandlers={{
                click: () => {
                  if (selectMode && onTogglePole) onTogglePole(pole.id);
                  else onSelectPole?.(pole.id);
                },
              }}
            />
          );
        })}
      </MapContainer>
      <div className="map-legend">
        {usedStatuses.map((s) => (
          <span className="item" key={s}>
            <span className="badge-dot" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
