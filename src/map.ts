import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Leaflet用CSSのバンドルインポート
import { PointCoord } from './types';

// 地図の初期化（中心：オートポリス）
export function initMap(containerId: string): L.Map {
  const gsiAttribution = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>';
  
  // maxNativeZoomを18（タイルの限界）、maxZoomを20（拡大の限界）に設定
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
    center: [33.036034, 130.982260], // オートポリス
    zoom: 14,
    maxZoom: 20, // ★マップ全体としてのズーム上限も20に引き上げ
    zoomControl: false,
    layers: [paleTile]
  });

  L.control.layers({ '淡色地図': paleTile, '航空写真': seamlessPhotoTile }, undefined, { position: 'topright' }).addTo(map);
  return map;
}

// ドラッグ用「+」マーカー（SVGによる厳密な座標中心描画に変更）
export const plusIcon = L.divIcon({
  className: 'plus-marker',
  html: `
    <svg width="20" height="20" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      <line x1="10" y1="2" x2="10" y2="18" stroke="#ff0000" stroke-width="3" />
      <line x1="2" y1="10" x2="18" y2="10" stroke="#ff0000" stroke-width="3" />
    </svg>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// 引き出し線のベクトル計算
export function getLabelOffsetVector(map: L.Map, source: PointCoord, target: PointCoord | null, angleDeg: number = 30): { dx: number; dy: number } {
  const distance = 45;
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
  const width = Math.max(140, Math.abs(dx) * 2 + 50);
  const height = Math.max(140, Math.abs(dy) * 2 + 50);
  const cx = width / 2;
  const cy = height / 2;
  const targetX = cx + dx;
  const targetY = cy + dy;

  const svg = `
    <svg width="${width}" height="${height}" style="position: absolute; left: ${-cx}px; top: ${-cy}px; pointer-events: none;">
      <line x1="${cx}" y1="${cy}" x2="${targetX}" y2="${targetY}" stroke="#ff0000" stroke-width="2" stroke-dasharray="3,3" />
      <circle cx="${targetX}" cy="${targetY}" r="12" fill="#ff0000" />
      <text x="${targetX}" y="${targetY + 4}" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">${labelText}</text>
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
  let offsetY = -35;

  if (len > 0) {
    const distance = 35;
    offsetX = (-vy / len) * distance;
    offsetY = (vx / len) * distance;
  }

  return map.containerPointToLatLng(L.point(midX + offsetX, midY + offsetY));
}

// 囲み数字のアイコン生成
export function createSegmentNumberIcon(numStr: string): L.DivIcon {
  return L.divIcon({
    className: 'segment-number-label',
    html: `<span>${numStr}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}
