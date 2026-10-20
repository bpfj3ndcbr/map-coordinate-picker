import L from 'leaflet';
import { PointCoord, ConfirmedPair } from './types';
import { initMap, plusIcon, getLabelOffsetVector, createCalloutIcon, getSegmentNumberLatLng, createSegmentNumberIcon } from './map';
import { getDisplayNumber, updateClipboardText, renderPairList } from './ui';

// ---------------------------------------------------------------------------
// サーキットマスターデータ
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

// 移動再編集中の排他制御ロックフラグ
let isEditing = false; 

let currentPointA: PointCoord | null = null;
let currentPointB: PointCoord | null = null;
let currentMarkerA: L.Marker | null = null;
let currentMarkerB: L.Marker | null = null;
let currentLineAB: L.Polyline | null = null;
let currentLabelMarkerA: L.Marker | null = null;
let currentLabelMarkerB: L.Marker | null = null;
let actionPopupMarker: L.Marker | null = null;

// 再編集時のバックアップ用
let originalPointForEdit: PointCoord | null = null;
let originalPairForEdit: { pointA: PointCoord, pointB: PointCoord } | null = null;
let originalNumberLatLngForEdit: L.LatLng | null = null;

// ---------------------------------------------------------------------------
// 初期化・DOM取得
// ---------------------------------------------------------------------------
const map = initMap('map');
setTimeout(() => { map.invalidateSize(); }, 200);

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

// ---------------------------------------------------------------------------
// 描画・更新処理
// ---------------------------------------------------------------------------
function updateUI(): void {
  updateClipboardText(resultInput, confirmedPairs);
  renderPairList(pairListContainer, pairListEl, confirmedPairs, {
    onMove: handleMovePair,
    onDelete: handleDeletePair,
    onPan: (pair) => {
      const bounds = L.latLngBounds(
        [pair.pointA.lat, pair.pointA.lng],
        [pair.pointB.lat, pair.pointB.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 } as L.FitBoundsOptions);
    }
  });
}

function clearCurrentDraft(): void {
  if (currentMarkerA) map.removeLayer(currentMarkerA);
  if (currentMarkerB) map.removeLayer(currentMarkerB);
  if (currentLineAB) map.removeLayer(currentLineAB);
  if (currentLabelMarkerA) map.removeLayer(currentLabelMarkerA);
  if (currentLabelMarkerB) map.removeLayer(currentLabelMarkerB);
  if (actionPopupMarker) map.removeLayer(actionPopupMarker);

  currentPointA = null;
  currentPointB = null;
  currentMarkerA = null;
  currentMarkerB = null;
  currentLineAB = null;
  currentLabelMarkerA = null;
  currentLabelMarkerB = null;
  actionPopupMarker = null;

  // ※ ここでの statusEl の上書きは削除し confirmCurrentPair 側に委譲
}

function updateDraftLineAndLabels(): void {
  if (currentPointA && currentMarkerA) {
    const latlngA = currentMarkerA.getLatLng();
    currentPointA = { lat: latlngA.lat, lng: latlngA.lng };
  }
  if (currentPointB && currentMarkerB) {
    const latlngB = currentMarkerB.getLatLng();
    currentPointB = { lat: latlngB.lat, lng: latlngB.lng };
  }

  if (currentPointA && currentMarkerA) {
    const offsetA = getLabelOffsetVector(map, currentPointA, currentPointB);
    const iconA = createCalloutIcon('A', offsetA);
    if (!currentLabelMarkerA) {
      currentLabelMarkerA = L.marker([currentPointA.lat, currentPointA.lng], { icon: iconA, interactive: false }).addTo(map);
    } else {
      currentLabelMarkerA.setLatLng([currentPointA.lat, currentPointA.lng]);
      currentLabelMarkerA.setIcon(iconA);
    }
  }

  if (currentPointB && currentMarkerB) {
    const offsetB = getLabelOffsetVector(map, currentPointB, currentPointA);
    const iconB = createCalloutIcon('B', offsetB);
    if (!currentLabelMarkerB) {
      currentLabelMarkerB = L.marker([currentPointB.lat, currentPointB.lng], { icon: iconB, interactive: false }).addTo(map);
    } else {
      currentLabelMarkerB.setLatLng([currentPointB.lat, currentPointB.lng]);
      currentLabelMarkerB.setIcon(iconB);
    }
  }

  if (currentPointA && currentPointB) {
    const latlngs: [number, number][] = [
      [currentPointA.lat, currentPointA.lng],
      [currentPointB.lat, currentPointB.lng]
    ];
    if (!currentLineAB) {
      currentLineAB = L.polyline(latlngs, { color: '#ffcc00', weight: 2, dashArray: '5, 5' }).addTo(map);
    } else {
      currentLineAB.setLatLngs(latlngs);
    }
  }
}

// ---------------------------------------------------------------------------
// 確定済みペアのレイヤー更新
// ---------------------------------------------------------------------------
function updateConfirmedPairLayers(pair: ConfirmedPair, draggingMarker?: L.Marker): void {
  if (pair.line) {
    pair.line.setLatLngs([
      [pair.pointA.lat, pair.pointA.lng],
      [pair.pointB.lat, pair.pointB.lng]
    ]);
  }
  if (pair.markerA && pair.markerA !== draggingMarker) pair.markerA.setLatLng([pair.pointA.lat, pair.pointA.lng]);
  if (pair.markerB && pair.markerB !== draggingMarker) pair.markerB.setLatLng([pair.pointB.lat, pair.pointB.lng]);
  
  if (pair.labelA && pair.labelA !== draggingMarker) {
    const offsetA = getLabelOffsetVector(map, pair.pointA, pair.pointB);
    pair.labelA.setLatLng([pair.pointA.lat, pair.pointA.lng]);
    pair.labelA.setIcon(createCalloutIcon('A', offsetA));
  }
  
  if (pair.labelB && pair.labelB !== draggingMarker) {
    const offsetB = getLabelOffsetVector(map, pair.pointB, pair.pointA);
    pair.labelB.setLatLng([pair.pointB.lat, pair.pointB.lng]);
    pair.labelB.setIcon(createCalloutIcon('B', offsetB));
  }
  
  if (pair.numberMarker && pair.numberMarker !== draggingMarker) {
    const numLatLng = getSegmentNumberLatLng(map, pair.pointA, pair.pointB);
    pair.numberMarker.setLatLng(numLatLng);
  }
}

// ---------------------------------------------------------------------------
// アクションポップアップ表示ロジック
// ---------------------------------------------------------------------------
function showActionPopup(
  latlng: L.LatLng, 
  mode: 'create' | 'edit' | 'edit-confirm' | 'edit-line' | 'edit-confirm-line', 
  pair?: ConfirmedPair, 
  pointType?: 'A' | 'B'
): void {
  if (actionPopupMarker) map.removeLayer(actionPopupMarker);

  const pCurrent = map.latLngToContainerPoint(latlng);
  const popupWidth = 120;
  const popupHeight = 110;

  let offsetX = 0;
  let offsetY = 0;

  // 1. 線分・ペア全体基準の場合 (番号ラベルと完全対称・遠くに押し出す)
  if (pair && (mode === 'edit-line' || mode === 'edit-confirm-line')) {
    const pA = map.latLngToContainerPoint([pair.pointA.lat, pair.pointA.lng]);
    const pB = map.latLngToContainerPoint([pair.pointB.lat, pair.pointB.lng]);
    const midX = (pA.x + pB.x) / 2;
    const midY = (pA.y + pB.y) / 2;

    const vx = pB.x - pA.x;
    const vy = pB.y - pA.y;
    const len = Math.hypot(vx, vy);
    
    let nx = 0;
    let ny = -1;
    if (len > 0) {
      nx = -vy / len; 
      ny = vx / len;
    }

    const reverseNx = -nx;
    const reverseNy = -ny;
    const distFromLine = 135;

    const targetCx = midX + reverseNx * distFromLine;
    const targetCy = midY + reverseNy * distFromLine;

    offsetX = targetCx - pCurrent.x;
    offsetY = targetCy - pCurrent.y;
  } 
  // 2. 点A/点B基準の場合 (ラベルの外側へ押し出す)
  else {
    let targetCoord: PointCoord | null = null;
    const sourceCoord = { lat: latlng.lat, lng: latlng.lng };

    if (mode === 'create' && currentPointA) {
      targetCoord = currentPointA;
    } else if ((mode === 'edit' || mode === 'edit-confirm') && pair && pointType) {
      targetCoord = pointType === 'A' ? pair.pointB : pair.pointA;
    }

    const labelOffset = getLabelOffsetVector(map, sourceCoord, targetCoord);
    const lx = labelOffset.dx;
    const ly = labelOffset.dy;

    const lLen = Math.hypot(lx, ly);
    let nx = 0;
    let ny = -1;
    if (lLen > 0) {
      nx = lx / lLen;
      ny = ly / lLen;
    }

    const distFromLabel = 80;
    offsetX = lx + nx * distFromLabel;
    offsetY = ly + ny * distFromLabel;

    let targetX = pCurrent.x + offsetX;
    let targetY = pCurrent.y + offsetY;

    const mapSize = map.getSize();
    const sideDist = 80;
    if (
      targetX - popupWidth / 2 < 10 ||
      targetX + popupWidth / 2 > mapSize.x - 10 ||
      targetY - popupHeight / 2 < 10 ||
      targetY + popupHeight / 2 > mapSize.y - 10
    ) {
      const candidates = [
        { x: lx - ny * sideDist, y: ly + nx * sideDist },  
        { x: lx + ny * sideDist, y: ly - nx * sideDist },  
        { x: lx - nx * distFromLabel, y: ly - ny * distFromLabel }
      ];

      for (const cand of candidates) {
        const cx = pCurrent.x + cand.x;
        const cy = pCurrent.y + cand.y;
        if (
          cx - popupWidth / 2 >= 10 &&
          cx + popupWidth / 2 <= mapSize.x - 10 &&
          cy - popupHeight / 2 >= 10 &&
          cy + popupHeight / 2 <= mapSize.y - 10
        ) {
          offsetX = cand.x;
          offsetY = cand.y;
          break;
        }
      }
    }
  }

  const anchorX = -(offsetX - popupWidth / 2);
  const anchorY = -(offsetY - popupHeight / 2);

  const div = document.createElement('div');
  div.className = 'custom-action-popup';

  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);

  // -------------------------------------------------------------------------
  // タイトル部（ペア番号をバッジデザインで表示）
  // -------------------------------------------------------------------------
  const titleDiv = document.createElement('div');
  titleDiv.className = 'popup-title';
  titleDiv.style.display = 'flex';
  titleDiv.style.alignItems = 'center';
  titleDiv.style.justifyContent = 'center';
  titleDiv.style.gap = '4px';

  if (pair) {
    const badge = document.createElement('div');
    badge.className = 'segment-number-label'; // 地図上と同じクラスを適用してデザインを統一
    badge.style.position = 'static';
    badge.style.width = '20px';
    badge.style.height = '20px';
    badge.style.fontSize = '10px';
    badge.style.boxShadow = 'none';
    badge.innerHTML = `<span>${getDisplayNumber(pair.originalIndex)}</span>`;
    
    const textSpan = document.createElement('span');
    textSpan.textContent = 'を編集中';

    titleDiv.appendChild(badge);
    titleDiv.appendChild(textSpan);
  } else {
    titleDiv.textContent = '新規作成';
  }
  div.appendChild(titleDiv);

  // -------------------------------------------------------------------------
  // 各モードのボタン生成
  // -------------------------------------------------------------------------
  if (mode === 'create') {
    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = '確定';
    btnConfirm.style.backgroundColor = '#28a745';
    btnConfirm.style.color = '#fff';
    btnConfirm.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      confirmCurrentPair(true); // 続けて次のペアを作成できるように true を渡す
    });

    const btnCancel = document.createElement('button');
    btnCancel.textContent = '取り消し';
    btnCancel.style.backgroundColor = '#dc3545';
    btnCancel.style.color = '#fff';
    btnCancel.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      clearCurrentDraft();
      statusEl.textContent = '地点 A をクリックしてください';
    });

    div.appendChild(btnConfirm);
    div.appendChild(btnCancel);

  } else if (mode === 'edit' && pair && pointType) {
    const btnMove = document.createElement('button');
    btnMove.textContent = `地点 ${pointType} を移動`;
    btnMove.style.backgroundColor = '#ffc107';
    btnMove.style.color = '#000';
    btnMove.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      enablePointMove(pair, pointType);
    });

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'ペア全体を削除';
    btnDelete.style.backgroundColor = '#dc3545';
    btnDelete.style.color = '#fff';
    btnDelete.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      const idx = confirmedPairs.indexOf(pair);
      if (idx !== -1) handleDeletePair(idx);
    });

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'キャンセル';
    btnCancel.style.backgroundColor = '#6c757d';
    btnCancel.style.color = '#fff';
    btnCancel.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
    });

    div.appendChild(btnMove);
    div.appendChild(btnDelete);
    div.appendChild(btnCancel);

  } else if (mode === 'edit-confirm' && pair && pointType) {
    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = '変更を確定';
    btnConfirm.style.backgroundColor = '#28a745';
    btnConfirm.style.color = '#fff';
    btnConfirm.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      
      const tMarker = pointType === 'A' ? pair.markerA : pair.markerB;
      const tLabel  = pointType === 'A' ? pair.labelA : pair.labelB;
      tMarker?.dragging?.disable();
      tMarker?.off('drag dragend');
      tLabel?.dragging?.disable();
      tLabel?.off('drag dragend');
      
      originalPointForEdit = null;
      isEditing = false;
      updateConfirmedPairLayers(pair);
      updateUI();
      statusEl.textContent = '変更を確定しました';
    });

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'キャンセル';
    btnCancel.style.backgroundColor = '#dc3545';
    btnCancel.style.color = '#fff';
    btnCancel.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      
      if (originalPointForEdit) {
        if (pointType === 'A') pair.pointA = { ...originalPointForEdit };
        else pair.pointB = { ...originalPointForEdit };
        updateConfirmedPairLayers(pair);
      }
      
      const tMarker = pointType === 'A' ? pair.markerA : pair.markerB;
      const tLabel  = pointType === 'A' ? pair.labelA : pair.labelB;
      tMarker?.dragging?.disable();
      tMarker?.off('drag dragend');
      tLabel?.dragging?.disable();
      tLabel?.off('drag dragend');
      
      originalPointForEdit = null;
      isEditing = false;
      updateUI();
      statusEl.textContent = '移動をキャンセルしました';
    });

    div.appendChild(btnConfirm);
    div.appendChild(btnCancel);

  } else if (mode === 'edit-line' && pair) {
    const btnMove = document.createElement('button');
    btnMove.textContent = `ABペアの移動`;
    btnMove.style.backgroundColor = '#ffc107';
    btnMove.style.color = '#000';
    btnMove.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      enableLineMove(pair);
    });

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'ペア全体を削除';
    btnDelete.style.backgroundColor = '#dc3545';
    btnDelete.style.color = '#fff';
    btnDelete.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      const idx = confirmedPairs.indexOf(pair);
      if (idx !== -1) handleDeletePair(idx);
    });

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'キャンセル';
    btnCancel.style.backgroundColor = '#6c757d';
    btnCancel.style.color = '#fff';
    btnCancel.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
    });

    div.appendChild(btnMove);
    div.appendChild(btnDelete);
    div.appendChild(btnCancel);

  } else if (mode === 'edit-confirm-line' && pair) {
    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = '変更を確定';
    btnConfirm.style.backgroundColor = '#28a745';
    btnConfirm.style.color = '#fff';
    btnConfirm.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      
      pair.numberMarker?.dragging?.disable();
      pair.numberMarker?.off('drag dragend');
      
      originalPairForEdit = null;
      originalNumberLatLngForEdit = null;
      isEditing = false;
      updateConfirmedPairLayers(pair);
      updateUI();
      statusEl.textContent = 'ペアの平行移動を確定しました';
    });

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'キャンセル';
    btnCancel.style.backgroundColor = '#dc3545';
    btnCancel.style.color = '#fff';
    btnCancel.addEventListener('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (actionPopupMarker) map.removeLayer(actionPopupMarker);
      
      if (originalPairForEdit) {
        pair.pointA = { ...originalPairForEdit.pointA };
        pair.pointB = { ...originalPairForEdit.pointB };
        updateConfirmedPairLayers(pair);
      }
      
      pair.numberMarker?.dragging?.disable();
      pair.numberMarker?.off('drag dragend');
      
      originalPairForEdit = null;
      originalNumberLatLngForEdit = null;
      isEditing = false;
      updateUI();
      statusEl.textContent = '移動をキャンセルしました';
    });

    div.appendChild(btnConfirm);
    div.appendChild(btnCancel);
  }

  const icon = L.divIcon({
    className: '',
    html: div,
    iconSize: [popupWidth, popupHeight],
    iconAnchor: [anchorX, anchorY]
  });

  actionPopupMarker = L.marker(latlng, { icon, interactive: true, zIndexOffset: 100000 }).addTo(map);
}

// ---------------------------------------------------------------------------
// 確定処理・描画
// ---------------------------------------------------------------------------
function confirmCurrentPair(continueNext: boolean): void {
  if (!currentPointA || !currentPointB) return;

  totalCreatedCount++;
  const pair: ConfirmedPair = {
    originalIndex: totalCreatedCount,
    pointA: { ...currentPointA },
    pointB: { ...currentPointB },
    line: null,
    markerA: null,
    markerB: null,
    labelA: null,
    labelB: null,
    numberMarker: null
  };

  clearCurrentDraft();
  confirmedPairs.push(pair);
  renderConfirmedPair(pair);
  updateUI();

  if (continueNext) {
    statusEl.textContent = '地点 A をクリックしてください';
  } else {
    statusEl.textContent = `地点 ${getDisplayNumber(pair.originalIndex)} を確定しました`;
  }
}

function renderConfirmedPair(pair: ConfirmedPair): void {
  const numStr = getDisplayNumber(pair.originalIndex);

  pair.line = L.polyline(
    [[pair.pointA.lat, pair.pointA.lng], [pair.pointB.lat, pair.pointB.lng]],
    { color: '#ffcc00', weight: 4 }
  ).addTo(map);

  pair.line.on('contextmenu', (e: L.LeafletMouseEvent) => {
    if (isEditing) return;
    L.DomEvent.stopPropagation(e);
    showActionPopup(e.latlng, 'edit-line', pair);
  });

  pair.markerA = L.marker([pair.pointA.lat, pair.pointA.lng], { icon: plusIcon, interactive: true }).addTo(map);
  pair.markerB = L.marker([pair.pointB.lat, pair.pointB.lng], { icon: plusIcon, interactive: true }).addTo(map);

  pair.markerA.on('contextmenu', (e: L.LeafletMouseEvent) => {
    if (isEditing) return;
    L.DomEvent.stopPropagation(e);
    showActionPopup(e.latlng, 'edit', pair, 'A');
  });

  pair.markerB.on('contextmenu', (e: L.LeafletMouseEvent) => {
    if (isEditing) return;
    L.DomEvent.stopPropagation(e);
    showActionPopup(e.latlng, 'edit', pair, 'B');
  });

  const offsetA = getLabelOffsetVector(map, pair.pointA, pair.pointB);
  pair.labelA = L.marker([pair.pointA.lat, pair.pointA.lng], {
    icon: createCalloutIcon('A', offsetA),
    interactive: true
  }).addTo(map);

  const offsetB = getLabelOffsetVector(map, pair.pointB, pair.pointA);
  pair.labelB = L.marker([pair.pointB.lat, pair.pointB.lng], {
    icon: createCalloutIcon('B', offsetB),
    interactive: true
  }).addTo(map);

  pair.labelA.on('contextmenu', (e: L.LeafletMouseEvent) => {
    if (isEditing) return;
    L.DomEvent.stopPropagation(e);
    showActionPopup(e.latlng, 'edit', pair, 'A');
  });

  pair.labelB.on('contextmenu', (e: L.LeafletMouseEvent) => {
    if (isEditing) return;
    L.DomEvent.stopPropagation(e);
    showActionPopup(e.latlng, 'edit', pair, 'B');
  });

  const numLatLng = getSegmentNumberLatLng(map, pair.pointA, pair.pointB);
  pair.numberMarker = L.marker(numLatLng, {
    icon: createSegmentNumberIcon(numStr),
    interactive: true
  }).addTo(map);

  pair.numberMarker.on('contextmenu', (e: L.LeafletMouseEvent) => {
    if (isEditing) return;
    L.DomEvent.stopPropagation(e);
    showActionPopup(e.latlng, 'edit-line', pair);
  });
}

function removeConfirmedPairLayers(pair: ConfirmedPair): void {
  if (pair.line) map.removeLayer(pair.line);
  if (pair.markerA) map.removeLayer(pair.markerA);
  if (pair.markerB) map.removeLayer(pair.markerB);
  if (pair.labelA) map.removeLayer(pair.labelA);
  if (pair.labelB) map.removeLayer(pair.labelB);
  if (pair.numberMarker) map.removeLayer(pair.numberMarker);
}

// ---------------------------------------------------------------------------
// 点の個別移動
// ---------------------------------------------------------------------------
function enablePointMove(pair: ConfirmedPair, pointType: 'A' | 'B'): void {
  const targetMarker = pointType === 'A' ? pair.markerA : pair.markerB;
  const targetLabel  = pointType === 'A' ? pair.labelA : pair.labelB;
  if (!targetMarker || !targetLabel) return;

  isEditing = true;
  originalPointForEdit = pointType === 'A' ? { ...pair.pointA } : { ...pair.pointB };

  targetMarker.dragging?.enable();
  targetLabel.dragging?.enable();
  statusEl.textContent = `地点 ${pointType} またはラベルをドラッグして移動してください`;

  targetMarker.off('drag dragend');
  targetLabel.off('drag dragend');

  showActionPopup(targetMarker.getLatLng(), 'edit-confirm', pair, pointType);

  const onDrag = (e: L.LeafletEvent) => {
    const latlng = (e.target as L.Marker).getLatLng();
    if (pointType === 'A') {
      pair.pointA = { lat: latlng.lat, lng: latlng.lng };
    } else {
      pair.pointB = { lat: latlng.lat, lng: latlng.lng };
    }
    updateConfirmedPairLayers(pair, e.target as L.Marker);
    if (actionPopupMarker) map.removeLayer(actionPopupMarker);
  };

  const onDragEnd = (e: L.LeafletEvent) => {
    updateConfirmedPairLayers(pair);
    showActionPopup((e.target as L.Marker).getLatLng(), 'edit-confirm', pair, pointType);
  };

  targetMarker.on('drag', onDrag);
  targetLabel.on('drag', onDrag);
  targetMarker.on('dragend', onDragEnd);
  targetLabel.on('dragend', onDragEnd);
}

// ---------------------------------------------------------------------------
// ペアの平行移動（ドラッグ追従）
// ---------------------------------------------------------------------------
function enableLineMove(pair: ConfirmedPair): void {
  const targetMarker = pair.numberMarker;
  if (!targetMarker) return;

  isEditing = true;
  originalPairForEdit = { pointA: { ...pair.pointA }, pointB: { ...pair.pointB } };
  originalNumberLatLngForEdit = targetMarker.getLatLng();

  targetMarker.dragging?.enable();
  statusEl.textContent = `番号ラベルをドラッグしてペア全体を平行移動してください`;

  targetMarker.off('drag dragend');

  showActionPopup(targetMarker.getLatLng(), 'edit-confirm-line', pair);

  targetMarker.on('drag', () => {
    if (!originalNumberLatLngForEdit || !originalPairForEdit) return;

    const currentLatLng = targetMarker.getLatLng();
    const latDiff = currentLatLng.lat - originalNumberLatLngForEdit.lat;
    const lngDiff = currentLatLng.lng - originalNumberLatLngForEdit.lng;

    pair.pointA = { 
      lat: originalPairForEdit.pointA.lat + latDiff, 
      lng: originalPairForEdit.pointA.lng + lngDiff 
    };
    pair.pointB = { 
      lat: originalPairForEdit.pointB.lat + latDiff, 
      lng: originalPairForEdit.pointB.lng + lngDiff 
    };
    
    updateConfirmedPairLayers(pair, targetMarker);
    if (actionPopupMarker) map.removeLayer(actionPopupMarker);
  });

  targetMarker.on('dragend', () => {
    updateConfirmedPairLayers(pair);
    showActionPopup(targetMarker.getLatLng(), 'edit-confirm-line', pair);
  });
}

// ---------------------------------------------------------------------------
// リスト操作
// ---------------------------------------------------------------------------
function handleMovePair(index: number, direction: number): void {
  if (isEditing) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= confirmedPairs.length) return;

  const temp = confirmedPairs[index];
  confirmedPairs[index] = confirmedPairs[newIndex];
  confirmedPairs[newIndex] = temp;
  updateUI();
}

function handleDeletePair(index: number): void {
  if (isEditing) {
    alert('地点の移動モード中です。\nまずは地図上の「変更を確定」または「キャンセル」を選択して完了してください。');
    return;
  }
  const pair = confirmedPairs[index];
  removeConfirmedPairLayers(pair);
  confirmedPairs.splice(index, 1);
  updateUI();
}

// ---------------------------------------------------------------------------
// マップクリックイベント
// ---------------------------------------------------------------------------
map.on('click', (e: L.LeafletMouseEvent) => {
  if (isSearching || isEditing) return;

  const coord: PointCoord = { lat: e.latlng.lat, lng: e.latlng.lng };

  if (!currentPointA) {
    currentPointA = coord;
    currentMarkerA = L.marker([coord.lat, coord.lng], { icon: plusIcon, draggable: true }).addTo(map);

    currentMarkerA.on('drag', () => {
      updateDraftLineAndLabels();
      if (currentPointB && currentMarkerB) showActionPopup(currentMarkerB.getLatLng(), 'create');
    });

    updateDraftLineAndLabels();
    statusEl.textContent = '地点 B をクリックしてください';
  } else if (!currentPointB) {
    currentPointB = coord;
    currentMarkerB = L.marker([coord.lat, coord.lng], { icon: plusIcon, draggable: true }).addTo(map);

    currentMarkerB.on('drag', () => {
      updateDraftLineAndLabels();
      if (currentMarkerB) showActionPopup(currentMarkerB.getLatLng(), 'create');
    });

    updateDraftLineAndLabels();
    showActionPopup(e.latlng, 'create');
    statusEl.textContent = '確定ボタンを押してください';
  }
});

map.on('zoomend moveend', () => {
  zoomSlider.value = String(map.getZoom());
  zoomValueEl.textContent = String(map.getZoom());
  if (currentPointA && currentPointB) updateDraftLineAndLabels();
});

// ---------------------------------------------------------------------------
// UIコントロールイベント
// ---------------------------------------------------------------------------
zoomSlider.addEventListener('input', (e) => {
  const zoom = parseInt((e.target as HTMLInputElement).value, 10);
  map.setZoom(zoom);
});

zoomInBtn.addEventListener('click', () => map.zoomIn());
zoomOutBtn.addEventListener('click', () => map.zoomOut());

copyBtn.addEventListener('click', () => {
  if (!resultInput.value) return;
  resultInput.select();
  navigator.clipboard.writeText(resultInput.value).then(() => {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'コピー完了!';
    setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
  });
});

resetBtn.addEventListener('click', () => {
  if (isEditing) {
    alert('地点の移動モード中はリセットできません。\nまずは「キャンセル」等で完了してください。');
    return;
  }
  if (confirmedPairs.length === 0 && !currentPointA) return;
  if (confirm('すべての登録内容をリセットしますか？')) {
    clearCurrentDraft();
    confirmedPairs.forEach(removeConfirmedPairLayers);
    confirmedPairs = [];
    totalCreatedCount = 0;
    updateUI();
  }
});

async function handleSearch(): Promise<void> {
  const query = searchInput.value.trim();
  if (!query) return;

  isSearching = true;
  statusEl.textContent = '検索中...';

  try {
    const res = await fetch(`https://msearch.gsi.go.jp/address-search-api/msearch?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data && data.length > 0) {
      const [lng, lat] = data[0].geometry.coordinates;
      map.setView([lat, lng], 15);
      statusEl.textContent = `「${data[0].properties.title}」へ移動しました`;
    } else {
      statusEl.textContent = '該当する場所が見つかりませんでした';
    }
  } catch {
    statusEl.textContent = '検索処理でエラーが発生しました';
  } finally {
    isSearching = false;
  }
}

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) handleSearch();
});

circuitSelect.addEventListener('change', (e) => {
  const key = (e.target as HTMLSelectElement).value;
  if (!key || !CIRCUITS[key]) return;
  const circuit = CIRCUITS[key];
  map.setView([circuit.lat, circuit.lng], 15);
  statusEl.textContent = `「${circuit.name}」へ移動しました`;
  circuitSelect.value = '';
});
