import L from 'leaflet';
import { PointCoord, ConfirmedPair } from './types';
import { initMap, plusIcon, getLabelOffsetVector, createCalloutIcon, getSegmentNumberLatLng, createSegmentNumberIcon } from './map';
import { getCircledNumber, updateClipboardText, renderPairList } from './ui';

// ---------------------------------------------------------------------------
// 国内主要サーキットの座標マスターデータ
// ---------------------------------------------------------------------------
const CIRCUITS: Record<string, { name: string; lat: number; lng: number }> = {
  fsw: { name: '富士スピードウェイ', lat: 35.372176, lng: 138.927236 },
  suzuka: { name: '鈴鹿サーキット', lat: 34.843152, lng: 136.540810 },
  tc2000: { name: '筑波サーキット コース2000', lat: 36.151772, lng: 139.884501 },
  tc1000: { name: '筑波サーキット コース1000', lat: 36.149206, lng: 139.882414 },
  nikko: { name: '日光サーキット', lat: 36.602521, lng: 139.799754 },
  motegi: { name: 'モビリティリゾートもてぎ', lat: 36.533284, lng: 140.229338 },
  sugo: { name: 'スポーツランドSUGO', lat: 38.136868, lng: 140.781846 },
  autopolis: { name: 'オートポリス', lat: 33.036034, lng: 130.982260 },
  okayama: { name: '岡山国際サーキット', lat: 34.914902, lng: 134.220803 },
  sodegaura: { name: '袖ヶ浦フォレストレースウェイ', lat: 35.390558, lng: 140.063428 },
  honjo: { name: '本庄サーキット', lat: 36.208154, lng: 139.138407 },
  ebisu_east: { name: 'エビスサーキット 東コース', lat: 37.649662, lng: 140.380728 },
  meihan: { name: '名阪スポーツランド', lat: 34.616611, lng: 135.986611 }
};

// ---------------------------------------------------------------------------
// 状態管理
// ---------------------------------------------------------------------------
let confirmedPairs: ConfirmedPair[] = [];
let totalCreatedCount = 0;
let isSearching = false;

let currentPointA: PointCoord | null = null;
let currentPointB: PointCoord | null = null;
let currentMarkerA: L.Marker | null = null;
let currentMarkerB: L.Marker | null = null;
let currentLineAB: L.Polyline | null = null;
let currentLabelMarkerA: L.Marker | null = null;
let currentLabelMarkerB: L.Marker | null = null;
let actionPopup: L.Popup | null = null;

// ---------------------------------------------------------------------------
// 初期化・DOM要素取得
// ---------------------------------------------------------------------------
const map = initMap('map');

// アプリ初回読み込み時の地図描画サイズ調整
setTimeout(() => {
  map.invalidateSize();
}, 200);

const statusEl = document.getElementById('status') as HTMLDivElement;
const resultInput = document.getElementById('result-input') as HTMLTextAreaElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const pairListContainer = document.getElementById('pair-list-container') as HTMLDivElement;
const pairListEl = document.getElementById('pair-list') as HTMLDivElement;
const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement;
const zoomValueEl = document.getElementById('zoom-value') as HTMLSpanElement;
const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;

const circuitSelect = document.getElementById('circuit-select') as HTMLSelectElement;
const circuitBtn = document.getElementById('circuit-btn') as HTMLButtonElement;

// ---------------------------------------------------------------------------
// UI・描画の更新連携
// ---------------------------------------------------------------------------
function updateCurrentPairDrawings(): void {
  if (currentPointA && currentPointB) {
    const latLngs: L.LatLngExpression[] = [ [currentPointA.lat, currentPointA.lng], [currentPointB.lat, currentPointB.lng] ];
    if (currentLineAB) currentLineAB.setLatLngs(latLngs);
    else currentLineAB = L.polyline(latLngs, { color: '#ffff00', weight: 3, dashArray: '6, 6' }).addTo(map);
  } else if (currentLineAB) {
    map.removeLayer(currentLineAB);
    currentLineAB = null;
  }

  if (currentPointA) {
    const offsetA = getLabelOffsetVector(map, currentPointA, currentPointB, 30);
    const iconA = createCalloutIcon('A', offsetA);
    if (currentLabelMarkerA) {
      currentLabelMarkerA.setLatLng([currentPointA.lat, currentPointA.lng]).setIcon(iconA);
    } else {
      currentLabelMarkerA = L.marker([currentPointA.lat, currentPointA.lng], { icon: iconA, interactive: false }).addTo(map);
    }
  }

  if (currentPointB) {
    const offsetB = getLabelOffsetVector(map, currentPointB, currentPointA, 30);
    const iconB = createCalloutIcon('B', offsetB);
    if (currentLabelMarkerB) {
      currentLabelMarkerB.setLatLng([currentPointB.lat, currentPointB.lng]).setIcon(iconB);
    } else {
      currentLabelMarkerB = L.marker([currentPointB.lat, currentPointB.lng], { icon: iconB, interactive: false }).addTo(map);
    }
  }
}

function updateConfirmedPairsDrawings(): void {
  confirmedPairs.forEach((pair) => {
    const numLatLng = getSegmentNumberLatLng(map, pair.pointA, pair.pointB);
    pair.numberMarker.setLatLng(numLatLng);
  });
}

function updateOutputAndListUI(): void {
  updateClipboardText(resultInput, confirmedPairs);
  
  renderPairList(pairListContainer, pairListEl, confirmedPairs, {
    onMove: movePair,
    onDelete: deletePair,
    onPan: (pair) => {
      const midLat = (pair.pointA.lat + pair.pointB.lat) / 2;
      const midLng = (pair.pointA.lng + pair.pointB.lng) / 2;
      map.panTo([midLat, midLng], { animate: true, duration: 0.5 });
    }
  });
}

function movePair(index: number, direction: number): void {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= confirmedPairs.length) return;

  const temp = confirmedPairs[index];
  confirmedPairs[index] = confirmedPairs[targetIndex];
  confirmedPairs[targetIndex] = temp;

  updateOutputAndListUI();
  
  const midLat = (temp.pointA.lat + temp.pointB.lat) / 2;
  const midLng = (temp.pointA.lng + temp.pointB.lng) / 2;
  map.panTo([midLat, midLng], { animate: true, duration: 0.5 });
}

function deletePair(index: number): void {
  const pair = confirmedPairs[index];
  map.removeLayer(pair.markerA);
  map.removeLayer(pair.markerB);
  map.removeLayer(pair.lineAB);
  map.removeLayer(pair.labelMarkerA);
  map.removeLayer(pair.labelMarkerB);
  map.removeLayer(pair.numberMarker);

  confirmedPairs.splice(index, 1);
  updateOutputAndListUI();

  if (confirmedPairs.length === 0 && !currentPointA) {
    statusEl.textContent = '地点 A をクリックしてください';
  }
}

// ---------------------------------------------------------------------------
// アクションポップアップ制御
// ---------------------------------------------------------------------------
function showActionPopup(latLng: L.LatLng): void {
  removeActionPopup();

  const popupContent = document.createElement('div');
  popupContent.className = 'action-popup-container';

  const btnConfirm = document.createElement('button');
  btnConfirm.className = 'action-popup-btn btn-confirm';
  btnConfirm.textContent = '確定';
  btnConfirm.addEventListener('click', () => finalizeCurrentPair(false));

  const btnNext = document.createElement('button');
  btnNext.className = 'action-popup-btn btn-next';
  btnNext.textContent = '確定して次へ';
  btnNext.addEventListener('click', () => finalizeCurrentPair(true));

  const btnCancel = document.createElement('button');
  btnCancel.className = 'action-popup-btn btn-cancel';
  btnCancel.textContent = '取り消し';
  btnCancel.addEventListener('click', cancelCurrentPair);

  popupContent.appendChild(btnConfirm);
  popupContent.appendChild(btnNext);
  popupContent.appendChild(btnCancel);

  actionPopup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false, offset: [20, -10] })
    .setLatLng(latLng)
    .setContent(popupContent)
    .openOn(map);
}

function removeActionPopup(): void {
  if (actionPopup) {
    map.closePopup(actionPopup);
    actionPopup = null;
  }
}

function finalizeCurrentPair(continueNext: boolean): void {
  if (!currentPointA || !currentPointB || !currentMarkerA || !currentMarkerB || !currentLineAB || !currentLabelMarkerA || !currentLabelMarkerB) return;

  removeActionPopup();
  totalCreatedCount += 1;
  const numStr = getCircledNumber(totalCreatedCount);
  const numLatLng = getSegmentNumberLatLng(map, currentPointA, currentPointB);

  const numberMarker = L.marker(numLatLng, {
    icon: createSegmentNumberIcon(numStr),
    interactive: false
  }).addTo(map);

  currentMarkerA.dragging?.disable();
  currentMarkerB.dragging?.disable();

  confirmedPairs.push({
    id: Date.now().toString(),
    originalIndex: totalCreatedCount,
    pointA: { ...currentPointA },
    pointB: { ...currentPointB },
    markerA: currentMarkerA,
    markerB: currentMarkerB,
    lineAB: currentLineAB,
    labelMarkerA: currentLabelMarkerA,
    labelMarkerB: currentLabelMarkerB,
    numberMarker: numberMarker
  });

  currentPointA = currentPointB = currentMarkerA = currentMarkerB = currentLineAB = currentLabelMarkerA = currentLabelMarkerB = null;
  updateOutputAndListUI();
  
  statusEl.textContent = continueNext 
    ? `地点${numStr} を確定しました。次の地点 A をクリックしてください`
    : `すべての確定が完了しました（全${confirmedPairs.length}件）`;
}

function cancelCurrentPair(): void {
  removeActionPopup();
  if (currentMarkerA) map.removeLayer(currentMarkerA);
  if (currentMarkerB) map.removeLayer(currentMarkerB);
  if (currentLineAB) map.removeLayer(currentLineAB);
  if (currentLabelMarkerA) map.removeLayer(currentLabelMarkerA);
  if (currentLabelMarkerB) map.removeLayer(currentLabelMarkerB);

  currentPointA = currentPointB = currentMarkerA = currentMarkerB = currentLineAB = currentLabelMarkerA = currentLabelMarkerB = null;
  statusEl.textContent = '操作を取り消しました。地点 A をクリックしてください';
}

function createDraggableMarker(coord: PointCoord, isPointA: boolean): L.Marker {
  const m = L.marker([coord.lat, coord.lng], { icon: plusIcon, draggable: true }).addTo(map);
  m.on('drag', (e: L.LeafletEvent) => {
    const newPos = (e.target as L.Marker).getLatLng();
    if (isPointA) currentPointA = { lat: newPos.lat, lng: newPos.lng };
    else {
      currentPointB = { lat: newPos.lat, lng: newPos.lng };
      if (actionPopup) actionPopup.setLatLng(newPos);
    }
    updateCurrentPairDrawings();
  });
  return m;
}

// ---------------------------------------------------------------------------
// 住所検索 & サーキット選択処理
// ---------------------------------------------------------------------------
async function searchLocationWithGSI(): Promise<void> {
  if (isSearching) return;

  const query = searchInput.value.trim();
  if (!query) {
    statusEl.textContent = '検索キーワードを入力してください';
    return;
  }

  isSearching = true;
  searchBtn.disabled = true;
  searchBtn.textContent = '検索中...';
  statusEl.textContent = '国土地理院データベースを検索中...';

  try {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`サーバーエラー (HTTP ${response.status})`);

    const data = await response.json();
    if (data && data.length > 0) {
      const [lng, lat] = data[0].geometry.coordinates;
      map.flyTo([lat, lng], 15, { duration: 1.2 });
      statusEl.textContent = `「${data[0].properties.title || query}」へ移動しました`;
    } else {
      statusEl.textContent = '該当する住所・施設が見つかりませんでした';
    }
  } catch (error) {
    statusEl.textContent = '検索通信に失敗しました。接続を確認してください';
  } finally {
    isSearching = false;
    searchBtn.disabled = false;
    searchBtn.textContent = '検索';
  }
}

searchBtn.addEventListener('click', searchLocationWithGSI);
searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    searchLocationWithGSI();
  }
});

// サーキット選択ボタン処理
circuitBtn.addEventListener('click', () => {
  const key = circuitSelect.value;
  if (!key || !CIRCUITS[key]) {
    statusEl.textContent = 'サーキットを選択してください';
    return;
  }

  const target = CIRCUITS[key];
  map.flyTo([target.lat, target.lng], 15, { duration: 1.2 });
  statusEl.textContent = `「${target.name}」へ移動しました`;
});

// ---------------------------------------------------------------------------
// マップクリック・イベントリスナー設定
// ---------------------------------------------------------------------------
map.on('click', (e: L.LeafletMouseEvent) => {
  if (currentPointA && currentPointB) return;
  const { lat, lng } = e.latlng;

  if (!currentPointA) {
    currentPointA = { lat, lng };
    currentMarkerA = createDraggableMarker(currentPointA, true);
    updateCurrentPairDrawings();
    statusEl.textContent = '地点 B をクリックしてください';
  } else if (!currentPointB) {
    currentPointB = { lat, lng };
    currentMarkerB = createDraggableMarker(currentPointB, false);
    updateCurrentPairDrawings();
    statusEl.textContent = '「確定」「確定して次へ」「取り消し」を選択してください';
    showActionPopup(e.latlng);
  }
});

map.on('moveend', () => {
  updateCurrentPairDrawings();
  updateConfirmedPairsDrawings();
});

zoomSlider.addEventListener('input', () => {
  const zoomLevel = parseInt(zoomSlider.value, 10);
  map.setZoom(zoomLevel);
  zoomValueEl.textContent = `(Lv.${zoomLevel})`;
});
zoomInBtn.addEventListener('click', () => map.zoomIn());
zoomOutBtn.addEventListener('click', () => map.zoomOut());
map.on('zoomend', () => {
  zoomSlider.value = map.getZoom().toString();
  zoomValueEl.textContent = `(Lv.${map.getZoom()})`;
});

copyBtn.addEventListener('click', () => {
  if (!resultInput.value) return;
  navigator.clipboard.writeText(resultInput.value)
    .then(() => alert('クリップボードにコピーしました！'))
    .catch(() => alert('コピーに失敗しました'));
});

resetBtn.addEventListener('click', () => {
  confirmedPairs.forEach(pair => {
    map.removeLayer(pair.markerA).removeLayer(pair.markerB).removeLayer(pair.lineAB)
       .removeLayer(pair.labelMarkerA).removeLayer(pair.labelMarkerB).removeLayer(pair.numberMarker);
  });
  confirmedPairs = [];
  totalCreatedCount = 0;
  cancelCurrentPair();
  updateOutputAndListUI();
  statusEl.textContent = '地点 A をクリックしてください';
});
