import L from 'leaflet';

export interface PointCoord {
  lat: number;
  lng: number;
}

export interface ConfirmedPair {
  id: string;
  originalIndex: number; // 確定時の固有番号 (1, 2, 3...)
  pointA: PointCoord;
  pointB: PointCoord;
  markerA: L.Marker;
  markerB: L.Marker;
  lineAB: L.Polyline;
  labelMarkerA: L.Marker;
  labelMarkerB: L.Marker;
  numberMarker: L.Marker;
}
