import { CoordinateStore } from './store';
import { MapController } from './map-controller';
import { updateClipboardText, renderPairList } from './ui';

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
// DOM取得とコントローラー初期化
// ---------------------------------------------------------------------------
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

// アプリのコア（データと地図）を初期化
const store = new CoordinateStore();
const mapCtrl = new MapController('map', store, statusEl);

// ---------------------------------------------------------------------------
// Storeとのデータ同期（単方向データフロー）
// ---------------------------------------------------------------------------
store.subscribe(() => {
  const pairs = store.getPairs();
  
  // 地図の再描画を指示
  mapCtrl.syncWithStore();
  
  // UI（クリップボードテキストとリスト）の更新
  updateClipboardText(resultInput, pairs);
  renderPairList(pairListContainer, pairListEl, pairs, {
    onMove: (idx, dir) => store.movePairOrder(idx, dir),
    onDelete: (id) => store.deletePair(id),
    onPan: (pair) => mapCtrl.panToPair(pair)
  });
});

// ---------------------------------------------------------------------------
// UIコントロールのイベントリスナー
// ---------------------------------------------------------------------------
zoomSlider.addEventListener('input', (e) => {
  const zoom = parseInt((e.target as HTMLInputElement).value, 10);
  mapCtrl.map.setZoom(zoom);
});

zoomInBtn.addEventListener('click', () => mapCtrl.map.zoomIn());
zoomOutBtn.addEventListener('click', () => mapCtrl.map.zoomOut());

mapCtrl.map.on('zoomend', () => {
  zoomSlider.value = String(mapCtrl.map.getZoom());
  zoomValueEl.textContent = String(mapCtrl.map.getZoom());
});

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
  if (store.isEditing) {
    alert('地点の移動モード中はリセットできません。\nまずは「キャンセル」等で完了してください。');
    return;
  }
  if (store.getPairs().length === 0) return;
  if (confirm('すべての登録内容をリセットしますか？')) {
    mapCtrl.clearDraft();
    store.clearAll();
  }
});

// ---------------------------------------------------------------------------
// 検索・ジャンプ機能
// ---------------------------------------------------------------------------
async function handleSearch(): Promise<void> {
  const query = searchInput.value.trim();
  if (!query) return;

  mapCtrl.isSearching = true;
  statusEl.textContent = '検索中...';

  try {
    const res = await fetch(`https://msearch.gsi.go.jp/address-search-api/msearch?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data && data.length > 0) {
      const [lng, lat] = data[0].geometry.coordinates;
      mapCtrl.map.setView([lat, lng], 15);
      statusEl.textContent = `「${data[0].properties.title}」へ移動しました`;
    } else {
      statusEl.textContent = '該当する場所が見つかりませんでした';
    }
  } catch {
    statusEl.textContent = '検索処理でエラーが発生しました';
  } finally {
    mapCtrl.isSearching = false;
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
  mapCtrl.map.setView([circuit.lat, circuit.lng], 15);
  statusEl.textContent = `「${circuit.name}」へ移動しました`;
  circuitSelect.value = '';
});