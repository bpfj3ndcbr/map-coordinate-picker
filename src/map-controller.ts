import L from 'leaflet';
import { PointCoord, PairData, PairViewElements } from './types';
import { CoordinateStore } from './store';
import {
  initMap,
  plusIcon,
  getLabelOffsetVector,
  createCalloutIcon,
  getSegmentNumberLatLng,
  createSegmentNumberIcon
} from './map';
import { getDisplayNumber } from './ui';

export class MapController {
  public map: L.Map;
  private store: CoordinateStore;
  private viewElementsMap: Map<string, PairViewElements> = new Map();
  private statusEl: HTMLDivElement;

  // ドラフト（新規作成中）の状態
  public isSearching = false;
  private draftPointA: PointCoord | null = null;
  private draftPointB: PointCoord | null = null;
  private draftMarkerA: L.Marker | null = null;
  private draftMarkerB: L.Marker | null = null;
  private draftLine: L.Polyline | null = null;
  private draftLabelA: L.Marker | null = null;
  private draftLabelB: L.Marker | null = null;
  private actionPopupMarker: L.Marker | null = null;

  // 編集モードの状態
  private originalPointForEdit: PointCoord | null = null;
  private originalPairForEdit: { pointA: PointCoord; pointB: PointCoord } | null = null;
  private originalNumberLatLngForEdit: L.LatLng | null = null;
  private draggingMarker: L.Marker | null = null; // ドラッグ中マーカーのガタつき防止用

  constructor(containerId: string, store: CoordinateStore, statusEl: HTMLDivElement) {
    this.store = store;
    this.statusEl = statusEl;
    this.map = initMap(containerId);
    setTimeout(() => { this.map.invalidateSize(); }, 200);

    this.setupMapEvents();
  }

  private setupMapEvents(): void {
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.isSearching || this.store.isEditing) return;

      const coord: PointCoord = { lat: e.latlng.lat, lng: e.latlng.lng };

      if (!this.draftPointA) {
        this.draftPointA = coord;
        this.draftMarkerA = L.marker([coord.lat, coord.lng], { icon: plusIcon, draggable: true }).addTo(this.map);

        this.draftMarkerA.on('drag', () => {
          this.updateDraftLineAndLabels();
          if (this.draftPointB && this.draftMarkerB) this.showActionPopup(this.draftMarkerB.getLatLng(), 'create');
        });

        this.updateDraftLineAndLabels();
        this.statusEl.textContent = '地点 B をクリックしてください';
      } else if (!this.draftPointB) {
        this.draftPointB = coord;
        this.draftMarkerB = L.marker([coord.lat, coord.lng], { icon: plusIcon, draggable: true }).addTo(this.map);

        this.draftMarkerB.on('drag', () => {
          this.updateDraftLineAndLabels();
          if (this.draftMarkerB) this.showActionPopup(this.draftMarkerB.getLatLng(), 'create');
        });

        this.updateDraftLineAndLabels();
        this.showActionPopup(e.latlng, 'create');
        this.statusEl.textContent = '確定ボタンを押してください';
      }
    });

    this.map.on('zoomend moveend', () => {
      if (this.draftPointA && this.draftPointB) this.updateDraftLineAndLabels();
    });
  }

  // ---------------------------------------------------------------------------
  // Storeとの同期（データ駆動描画）
  // ---------------------------------------------------------------------------
  public syncWithStore(): void {
    const pairs = this.store.getPairs();
    const currentIds = new Set(pairs.map(p => p.id));

    // Storeから消されたレイヤーを地図からも削除
    for (const [id, elements] of this.viewElementsMap.entries()) {
      if (!currentIds.has(id)) {
        this.removeLayers(elements);
        this.viewElementsMap.delete(id);
      }
    }

    // 新規作成されたものは描画、既存のものは位置を更新
    pairs.forEach(pair => {
      if (!this.viewElementsMap.has(pair.id)) {
        this.renderConfirmedPair(pair);
      } else {
        this.updateConfirmedPairLayers(pair, this.viewElementsMap.get(pair.id)!);
      }
    });
  }

  public panToPair(pair: PairData): void {
    const bounds = L.latLngBounds(
      [pair.pointA.lat, pair.pointA.lng],
      [pair.pointB.lat, pair.pointB.lng]
    );
    this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 } as L.FitBoundsOptions);
  }

  // ---------------------------------------------------------------------------
  // ドラフト制御
  // ---------------------------------------------------------------------------
  public clearDraft(): void {
    if (this.draftMarkerA) this.map.removeLayer(this.draftMarkerA);
    if (this.draftMarkerB) this.map.removeLayer(this.draftMarkerB);
    if (this.draftLine) this.map.removeLayer(this.draftLine);
    if (this.draftLabelA) this.map.removeLayer(this.draftLabelA);
    if (this.draftLabelB) this.map.removeLayer(this.draftLabelB);
    if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);

    this.draftPointA = null;
    this.draftPointB = null;
    this.draftMarkerA = null;
    this.draftMarkerB = null;
    this.draftLine = null;
    this.draftLabelA = null;
    this.draftLabelB = null;
    this.actionPopupMarker = null;
  }

  private updateDraftLineAndLabels(): void {
    if (this.draftPointA && this.draftMarkerA) {
      const latlngA = this.draftMarkerA.getLatLng();
      this.draftPointA = { lat: latlngA.lat, lng: latlngA.lng };
    }
    if (this.draftPointB && this.draftMarkerB) {
      const latlngB = this.draftMarkerB.getLatLng();
      this.draftPointB = { lat: latlngB.lat, lng: latlngB.lng };
    }

    if (this.draftPointA && this.draftMarkerA) {
      const offsetA = getLabelOffsetVector(this.map, this.draftPointA, this.draftPointB);
      const iconA = createCalloutIcon('A', offsetA);
      if (!this.draftLabelA) {
        this.draftLabelA = L.marker([this.draftPointA.lat, this.draftPointA.lng], { icon: iconA, interactive: false }).addTo(this.map);
      } else {
        this.draftLabelA.setLatLng([this.draftPointA.lat, this.draftPointA.lng]);
        this.draftLabelA.setIcon(iconA);
      }
    }

    if (this.draftPointB && this.draftMarkerB) {
      const offsetB = getLabelOffsetVector(this.map, this.draftPointB, this.draftPointA);
      const iconB = createCalloutIcon('B', offsetB);
      if (!this.draftLabelB) {
        this.draftLabelB = L.marker([this.draftPointB.lat, this.draftPointB.lng], { icon: iconB, interactive: false }).addTo(this.map);
      } else {
        this.draftLabelB.setLatLng([this.draftPointB.lat, this.draftPointB.lng]);
        this.draftLabelB.setIcon(iconB);
      }
    }

    if (this.draftPointA && this.draftPointB) {
      const latlngs: [number, number][] = [
        [this.draftPointA.lat, this.draftPointA.lng],
        [this.draftPointB.lat, this.draftPointB.lng]
      ];
      if (!this.draftLine) {
        this.draftLine = L.polyline(latlngs, { color: '#ffcc00', weight: 2, dashArray: '5, 5' }).addTo(this.map);
      } else {
        this.draftLine.setLatLngs(latlngs);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 確定ペアレイヤー制御
  // ---------------------------------------------------------------------------
  private renderConfirmedPair(pair: PairData): void {
    const numStr = getDisplayNumber(pair.originalIndex);

    const line = L.polyline(
      [[pair.pointA.lat, pair.pointA.lng], [pair.pointB.lat, pair.pointB.lng]],
      { color: '#ffcc00', weight: 4 }
    ).addTo(this.map);

    line.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (this.store.isEditing) return;
      L.DomEvent.stopPropagation(e);
      this.showActionPopup(e.latlng, 'edit-line', pair);
    });

    const markerA = L.marker([pair.pointA.lat, pair.pointA.lng], { icon: plusIcon, interactive: true }).addTo(this.map);
    const markerB = L.marker([pair.pointB.lat, pair.pointB.lng], { icon: plusIcon, interactive: true }).addTo(this.map);

    markerA.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (this.store.isEditing) return;
      L.DomEvent.stopPropagation(e);
      this.showActionPopup(e.latlng, 'edit', pair, 'A');
    });
    markerB.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (this.store.isEditing) return;
      L.DomEvent.stopPropagation(e);
      this.showActionPopup(e.latlng, 'edit', pair, 'B');
    });

    const offsetA = getLabelOffsetVector(this.map, pair.pointA, pair.pointB);
    const labelA = L.marker([pair.pointA.lat, pair.pointA.lng], {
      icon: createCalloutIcon('A', offsetA),
      interactive: true
    }).addTo(this.map);

    const offsetB = getLabelOffsetVector(this.map, pair.pointB, pair.pointA);
    const labelB = L.marker([pair.pointB.lat, pair.pointB.lng], {
      icon: createCalloutIcon('B', offsetB),
      interactive: true
    }).addTo(this.map);

    labelA.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (this.store.isEditing) return;
      L.DomEvent.stopPropagation(e);
      this.showActionPopup(e.latlng, 'edit', pair, 'A');
    });
    labelB.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (this.store.isEditing) return;
      L.DomEvent.stopPropagation(e);
      this.showActionPopup(e.latlng, 'edit', pair, 'B');
    });

    const numLatLng = getSegmentNumberLatLng(this.map, pair.pointA, pair.pointB);
    const numberMarker = L.marker(numLatLng, {
      icon: createSegmentNumberIcon(numStr),
      interactive: true
    }).addTo(this.map);

    numberMarker.on('contextmenu', (e: L.LeafletMouseEvent) => {
      if (this.store.isEditing) return;
      L.DomEvent.stopPropagation(e);
      this.showActionPopup(e.latlng, 'edit-line', pair);
    });

    this.viewElementsMap.set(pair.id, { markerA, markerB, line, labelA, labelB, numberMarker });
  }

  private updateConfirmedPairLayers(pair: PairData, elements: PairViewElements): void {
    if (elements.line) {
      elements.line.setLatLngs([
        [pair.pointA.lat, pair.pointA.lng],
        [pair.pointB.lat, pair.pointB.lng]
      ]);
    }
    if (elements.markerA && elements.markerA !== this.draggingMarker) elements.markerA.setLatLng([pair.pointA.lat, pair.pointA.lng]);
    if (elements.markerB && elements.markerB !== this.draggingMarker) elements.markerB.setLatLng([pair.pointB.lat, pair.pointB.lng]);

    if (elements.labelA && elements.labelA !== this.draggingMarker) {
      const offsetA = getLabelOffsetVector(this.map, pair.pointA, pair.pointB);
      elements.labelA.setLatLng([pair.pointA.lat, pair.pointA.lng]);
      elements.labelA.setIcon(createCalloutIcon('A', offsetA));
    }
    if (elements.labelB && elements.labelB !== this.draggingMarker) {
      const offsetB = getLabelOffsetVector(this.map, pair.pointB, pair.pointA);
      elements.labelB.setLatLng([pair.pointB.lat, pair.pointB.lng]);
      elements.labelB.setIcon(createCalloutIcon('B', offsetB));
    }
    if (elements.numberMarker && elements.numberMarker !== this.draggingMarker) {
      const numLatLng = getSegmentNumberLatLng(this.map, pair.pointA, pair.pointB);
      elements.numberMarker.setLatLng(numLatLng);
    }
  }

  private removeLayers(elements: PairViewElements): void {
    if (elements.line) this.map.removeLayer(elements.line);
    if (elements.markerA) this.map.removeLayer(elements.markerA);
    if (elements.markerB) this.map.removeLayer(elements.markerB);
    if (elements.labelA) this.map.removeLayer(elements.labelA);
    if (elements.labelB) this.map.removeLayer(elements.labelB);
    if (elements.numberMarker) this.map.removeLayer(elements.numberMarker);
  }

  // ---------------------------------------------------------------------------
  // 編集・ドラッグ制御
  // ---------------------------------------------------------------------------
  private enablePointMove(pair: PairData, pointType: 'A' | 'B'): void {
    const elements = this.viewElementsMap.get(pair.id);
    if (!elements) return;

    const targetMarker = pointType === 'A' ? elements.markerA : elements.markerB;
    const targetLabel = pointType === 'A' ? elements.labelA : elements.labelB;
    if (!targetMarker || !targetLabel) return;

    this.store.isEditing = true;
    this.originalPointForEdit = pointType === 'A' ? { ...pair.pointA } : { ...pair.pointB };

    targetMarker.dragging?.enable();
    targetLabel.dragging?.enable();
    this.statusEl.textContent = `地点 ${pointType} またはラベルをドラッグして移動してください`;

    targetMarker.off('drag dragend');
    targetLabel.off('drag dragend');

    this.showActionPopup(targetMarker.getLatLng(), 'edit-confirm', pair, pointType);

    const onDrag = (e: L.LeafletEvent) => {
      this.draggingMarker = e.target as L.Marker;
      const latlng = this.draggingMarker.getLatLng();
      const newPoint = { lat: latlng.lat, lng: latlng.lng };

      if (pointType === 'A') this.store.updatePair(pair.id, newPoint, pair.pointB);
      else this.store.updatePair(pair.id, pair.pointA, newPoint);
      
      if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
    };

    const onDragEnd = (e: L.LeafletEvent) => {
      this.draggingMarker = null;
      this.syncWithStore(); 
      this.showActionPopup((e.target as L.Marker).getLatLng(), 'edit-confirm', pair, pointType);
    };

    targetMarker.on('drag', onDrag);
    targetLabel.on('drag', onDrag);
    targetMarker.on('dragend', onDragEnd);
    targetLabel.on('dragend', onDragEnd);
  }

  private enableLineMove(pair: PairData): void {
    const elements = this.viewElementsMap.get(pair.id);
    if (!elements || !elements.numberMarker) return;

    const targetMarker = elements.numberMarker;

    this.store.isEditing = true;
    this.originalPairForEdit = { pointA: { ...pair.pointA }, pointB: { ...pair.pointB } };
    this.originalNumberLatLngForEdit = targetMarker.getLatLng();

    targetMarker.dragging?.enable();
    this.statusEl.textContent = `番号ラベルをドラッグしてペア全体を平行移動してください`;

    targetMarker.off('drag dragend');
    this.showActionPopup(targetMarker.getLatLng(), 'edit-confirm-line', pair);

    targetMarker.on('drag', (e: L.LeafletEvent) => {
      if (!this.originalNumberLatLngForEdit || !this.originalPairForEdit) return;

      this.draggingMarker = e.target as L.Marker;
      const currentLatLng = this.draggingMarker.getLatLng();
      const latDiff = currentLatLng.lat - this.originalNumberLatLngForEdit.lat;
      const lngDiff = currentLatLng.lng - this.originalNumberLatLngForEdit.lng;

      const newPointA = {
        lat: this.originalPairForEdit.pointA.lat + latDiff,
        lng: this.originalPairForEdit.pointA.lng + lngDiff
      };
      const newPointB = {
        lat: this.originalPairForEdit.pointB.lat + latDiff,
        lng: this.originalPairForEdit.pointB.lng + lngDiff
      };

      this.store.updatePair(pair.id, newPointA, newPointB);
      if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
    });

    targetMarker.on('dragend', (e: L.LeafletEvent) => {
      this.draggingMarker = null;
      this.syncWithStore();
      this.showActionPopup((e.target as L.Marker).getLatLng(), 'edit-confirm-line', pair);
    });
  }

  // ---------------------------------------------------------------------------
  // アクションポップアップ
  // ---------------------------------------------------------------------------
  private showActionPopup(
    latlng: L.LatLng,
    mode: 'create' | 'edit' | 'edit-confirm' | 'edit-line' | 'edit-confirm-line',
    pair?: PairData,
    pointType?: 'A' | 'B'
  ): void {
    if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);

    const pCurrent = this.map.latLngToContainerPoint(latlng);
    const popupWidth = 120;
    const popupHeight = 110;
    let offsetX = 0;
    let offsetY = 0;

    if (pair && (mode === 'edit-line' || mode === 'edit-confirm-line')) {
      const pA = this.map.latLngToContainerPoint([pair.pointA.lat, pair.pointA.lng]);
      const pB = this.map.latLngToContainerPoint([pair.pointB.lat, pair.pointB.lng]);
      const midX = (pA.x + pB.x) / 2;
      const midY = (pA.y + pB.y) / 2;
      const vx = pB.x - pA.x;
      const vy = pB.y - pA.y;
      const len = Math.hypot(vx, vy);
      let nx = 0; let ny = -1;
      if (len > 0) { nx = -vy / len; ny = vx / len; }
      const distFromLine = 135;
      const targetCx = midX - nx * distFromLine;
      const targetCy = midY - ny * distFromLine;
      offsetX = targetCx - pCurrent.x;
      offsetY = targetCy - pCurrent.y;
    } else {
      let targetCoord: PointCoord | null = null;
      const sourceCoord = { lat: latlng.lat, lng: latlng.lng };

      if (mode === 'create' && this.draftPointA) {
        targetCoord = this.draftPointA;
      } else if ((mode === 'edit' || mode === 'edit-confirm') && pair && pointType) {
        targetCoord = pointType === 'A' ? pair.pointB : pair.pointA;
      }

      const labelOffset = getLabelOffsetVector(this.map, sourceCoord, targetCoord);
      const lx = labelOffset.dx; const ly = labelOffset.dy;
      const lLen = Math.hypot(lx, ly);
      let nx = 0; let ny = -1;
      if (lLen > 0) { nx = lx / lLen; ny = ly / lLen; }
      const distFromLabel = 80;
      offsetX = lx + nx * distFromLabel;
      offsetY = ly + ny * distFromLabel;

      let targetX = pCurrent.x + offsetX;
      let targetY = pCurrent.y + offsetY;
      const mapSize = this.map.getSize();
      const sideDist = 80;

      if (targetX - popupWidth / 2 < 10 || targetX + popupWidth / 2 > mapSize.x - 10 || targetY - popupHeight / 2 < 10 || targetY + popupHeight / 2 > mapSize.y - 10) {
        const candidates = [
          { x: lx - ny * sideDist, y: ly + nx * sideDist },
          { x: lx + ny * sideDist, y: ly - nx * sideDist },
          { x: lx - nx * distFromLabel, y: ly - ny * distFromLabel }
        ];
        for (const cand of candidates) {
          const cx = pCurrent.x + cand.x;
          const cy = pCurrent.y + cand.y;
          if (cx - popupWidth / 2 >= 10 && cx + popupWidth / 2 <= mapSize.x - 10 && cy - popupHeight / 2 >= 10 && cy + popupHeight / 2 <= mapSize.y - 10) {
            offsetX = cand.x; offsetY = cand.y; break;
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

    const titleDiv = document.createElement('div');
    titleDiv.className = 'popup-title';
    titleDiv.style.display = 'flex';
    titleDiv.style.alignItems = 'center';
    titleDiv.style.justifyContent = 'center';
    titleDiv.style.gap = '4px';

    if (pair) {
      const badge = document.createElement('div');
      badge.className = 'segment-number-label';
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

    if (mode === 'create') {
      const btnConfirm = document.createElement('button');
      btnConfirm.textContent = '確定';
      btnConfirm.style.backgroundColor = '#28a745';
      btnConfirm.style.color = '#fff';
      btnConfirm.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.draftPointA && this.draftPointB) {
          this.store.addPair(this.draftPointA, this.draftPointB); 
          this.clearDraft();
          this.statusEl.textContent = '地点 A をクリックしてください';
        }
      });
      const btnCancel = document.createElement('button');
      btnCancel.textContent = '取り消し';
      btnCancel.style.backgroundColor = '#dc3545';
      btnCancel.style.color = '#fff';
      btnCancel.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.clearDraft();
        this.statusEl.textContent = '地点 A をクリックしてください';
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
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        this.enablePointMove(pair, pointType);
      });
      const btnDelete = document.createElement('button');
      btnDelete.textContent = 'ペア全体を削除';
      btnDelete.style.backgroundColor = '#dc3545';
      btnDelete.style.color = '#fff';
      btnDelete.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        this.store.deletePair(pair.id); 
      });
      const btnCancel = document.createElement('button');
      btnCancel.textContent = 'キャンセル';
      btnCancel.style.backgroundColor = '#6c757d';
      btnCancel.style.color = '#fff';
      btnCancel.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
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
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        const elements = this.viewElementsMap.get(pair.id);
        const tMarker = pointType === 'A' ? elements?.markerA : elements?.markerB;
        const tLabel = pointType === 'A' ? elements?.labelA : elements?.labelB;
        tMarker?.dragging?.disable(); tMarker?.off('drag dragend');
        tLabel?.dragging?.disable(); tLabel?.off('drag dragend');
        
        this.originalPointForEdit = null;
        this.store.isEditing = false;
        this.syncWithStore();
        this.statusEl.textContent = '変更を確定しました';
      });
      const btnCancel = document.createElement('button');
      btnCancel.textContent = 'キャンセル';
      btnCancel.style.backgroundColor = '#dc3545';
      btnCancel.style.color = '#fff';
      btnCancel.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        
        if (this.originalPointForEdit) {
          if (pointType === 'A') this.store.updatePair(pair.id, this.originalPointForEdit, pair.pointB);
          else this.store.updatePair(pair.id, pair.pointA, this.originalPointForEdit);
        }
        
        const elements = this.viewElementsMap.get(pair.id);
        const tMarker = pointType === 'A' ? elements?.markerA : elements?.markerB;
        const tLabel = pointType === 'A' ? elements?.labelA : elements?.labelB;
        tMarker?.dragging?.disable(); tMarker?.off('drag dragend');
        tLabel?.dragging?.disable(); tLabel?.off('drag dragend');
        
        this.originalPointForEdit = null;
        this.store.isEditing = false;
        this.syncWithStore();
        this.statusEl.textContent = '移動をキャンセルしました';
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
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        this.enableLineMove(pair);
      });
      const btnDelete = document.createElement('button');
      btnDelete.textContent = 'ペア全体を削除';
      btnDelete.style.backgroundColor = '#dc3545';
      btnDelete.style.color = '#fff';
      btnDelete.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        this.store.deletePair(pair.id);
      });
      const btnCancel = document.createElement('button');
      btnCancel.textContent = 'キャンセル';
      btnCancel.style.backgroundColor = '#6c757d';
      btnCancel.style.color = '#fff';
      btnCancel.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
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
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        const elements = this.viewElementsMap.get(pair.id);
        elements?.numberMarker?.dragging?.disable();
        elements?.numberMarker?.off('drag dragend');
        
        this.originalPairForEdit = null;
        this.originalNumberLatLngForEdit = null;
        this.store.isEditing = false;
        this.syncWithStore();
        this.statusEl.textContent = 'ペアの平行移動を確定しました';
      });
      const btnCancel = document.createElement('button');
      btnCancel.textContent = 'キャンセル';
      btnCancel.style.backgroundColor = '#dc3545';
      btnCancel.style.color = '#fff';
      btnCancel.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.actionPopupMarker) this.map.removeLayer(this.actionPopupMarker);
        
        if (this.originalPairForEdit) {
          this.store.updatePair(pair.id, this.originalPairForEdit.pointA, this.originalPairForEdit.pointB);
        }
        const elements = this.viewElementsMap.get(pair.id);
        elements?.numberMarker?.dragging?.disable();
        elements?.numberMarker?.off('drag dragend');
        
        this.originalPairForEdit = null;
        this.originalNumberLatLngForEdit = null;
        this.store.isEditing = false;
        this.syncWithStore();
        this.statusEl.textContent = '移動をキャンセルしました';
      });
      div.appendChild(btnConfirm);
      div.appendChild(btnCancel);
    }

    const icon = L.divIcon({
      className: '', html: div,
      iconSize: [popupWidth, popupHeight], iconAnchor: [anchorX, anchorY]
    });
    this.actionPopupMarker = L.marker(latlng, { icon, interactive: true, zIndexOffset: 100000 }).addTo(this.map);
  }
}