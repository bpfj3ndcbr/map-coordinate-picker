import L from 'leaflet';

export interface PointCoord {
  lat: number;
  lng: number;
}

// Storeで一元管理する「純粋なデータモデル」
export interface PairData {
  id: string;          // 'pair-123456789' のような一意のID
  originalIndex: number; // 画面表示用の通し番号（「地点 1」など）
  pointA: PointCoord;
  pointB: PointCoord;
}

// MapControllerで管理する「Leafletの描画要素」
// 状態管理からは完全に切り離されます
export interface PairViewElements {
  markerA: L.Marker | null;
  markerB: L.Marker | null;
  line: L.Polyline | null;
  labelA: L.Marker | null;
  labelB: L.Marker | null;
  numberMarker: L.Marker | null;
}