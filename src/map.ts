import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PointCoord } from './types';

// 地図の初期化
export function initMap(containerId: string): L.Map {
  const gsiAttribution = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>';
  
  const paleTile = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', { 
    attribution: gsiAttribution, 
    maxNativeZoom: 18, 
    maxZoom: 20 
  });
  const seamlessPhotoTile = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', { 
    attribution: gsiAttribution, 
    maxNativeZoom: 18, 
    maxZoom: 20 
  });

  const map = L.map(containerId, {
    center: [33.036034, 130.982260],
    zoom: 14,
    maxZoom: 20,
    zoomControl: false,
    layers: [paleTile]
  });

  L.control.layers({ '淡色地図': paleTile, '航空写真': seamlessPhotoTile }, undefined, { position: 'topright' }).addTo(map);
  return map;
}

// ドラッグ用「+」マーカー（小サイズ: 14px × 14px）
export const plusIcon = L.divIcon({
  className: 'plus-marker',
  html: `
    <svg width="14" height="14" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      <line x1="7" y1="1" x2="7" y2="13" stroke="#ff0000" stroke-width="2.5" />
      <line x1="1" y1="7" x2="13" y2="7" stroke="#ff0000" stroke-width="2.5" />
    </svg>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// 引き出し線のベクトル計算
export function getLabelOffsetVector(map: L.Map, source: PointCoord, target: PointCoord | null, angleDeg: number = 30): { dx: number; dy: number } {
  const distance = 40;
  if (!target) {
    const rad = (angleDeg * Math.PI) / 180;
    return { dx: distance * Math.cos(rad), dy: -distance * Math.sin(rad) };
  }

  const pSource = map.latLngToContainerPoint([source.lat, source.lng]);
  const pTarget = map.latLngToContainerPoint([target.lat, target.lng]);

  const vx = pSource.x - pTarget.x;
  const vy = pSource.y - pTarget.y;
  const len = Math.hypot(vx, vy);

  if (len === 0) return { dx: distance, dy: -distance };

  const ux = vx / len;
  const uy = vy / len;
  const rad = (angleDeg * Math.PI) / 180;
  const rx = ux * Math.cos(rad) - uy * Math.sin(rad);
  const ry = ux * Math.sin(rad) + uy * Math.cos(rad);

  return { dx: rx * distance, dy: ry * distance };
}

// A/Bラベル（引き出し線付き）生成
export function createCalloutIcon(labelText: string, offset: { dx: number; dy: number }): L.DivIcon {
  const dx = offset.dx;
  const dy = offset.dy;
  const width = Math.max(120, Math.abs(dx) * 2 + 40);
  const height = Math.max(120, Math.abs(dy) * 2 + 40);
  const cx = width / 2;
  const cy = height / 2;
  const targetX = cx + dx;
  const targetY = cy + dy;

  // 丸(A)(B)自体をクリック・ドラッグ可能にするため pointer-events: auto を付与
  const svg = `
    <svg width="${width}" height="${height}" style="position: absolute; left: ${-cx}px; top: ${-cy}px; pointer-events: none;">
      <line x1="${cx}" y1="${cy}" x2="${targetX}" y2="${targetY}" stroke="#ff0000" stroke-width="2" stroke-dasharray="3,3" />
      <circle cx="${targetX}" cy="${targetY}" r="10" fill="#ff0000" style="pointer-events: auto;" />
      <text x="${targetX}" y="${targetY + 3.5}" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif" style="pointer-events: auto;">${labelText}</text>
    </svg>
  `;

  return L.divIcon({ className: 'callout-label', html: svg, iconSize: [0, 0], iconAnchor: [0, 0] });
}

// 線分中央の番号ラベル位置計算
export function getSegmentNumberLatLng(map: L.Map, pointA: PointCoord, pointB: PointCoord): L.LatLng {
  const pA = map.latLngToContainerPoint([pointA.lat, pointA.lng]);
  const pB = map.latLngToContainerPoint([pointB.lat, pointB.lng]);

  const midX = (pA.x + pB.x) / 2;
  const midY = (pA.y + pB.y) / 2;

  const vx = pB.x - pA.x;
  const vy = pB.y - pA.y;
  const len = Math.hypot(vx, vy);

  let offsetX = 0;
  let offsetY = -28;

  if (len > 0) {
    const distance = 28;
    offsetX = (-vy / len) * distance;
    offsetY = (vx / len) * distance;
  }

  return map.containerPointToLatLng(L.point(midX + offsetX, midY + offsetY));
}

// 番号アイコン生成
export function createSegmentNumberIcon(numStr: string): L.DivIcon {
  return L.divIcon({
    className: 'segment-number-label',
    html: `<span>${numStr}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}
