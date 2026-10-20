import L from 'leaflet';

export interface PointCoord {
  lat: number;
  lng: number;
}

export interface ConfirmedPair {
  originalIndex: number;
  pointA: PointCoord;
  pointB: PointCoord;
  markerA: L.Marker | null;
  markerB: L.Marker | null;
  line: L.Polyline | null;
  labelA: L.Marker | null;
  labelB: L.Marker | null;
  numberMarker: L.Marker | null;
}
