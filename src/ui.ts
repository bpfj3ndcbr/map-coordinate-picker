import { ConfirmedPair } from './types';

// 数字から囲み数字（①, ②...）への変換
export function getCircledNumber(num: number): string {
  if (num >= 1 && num <= 20) return String.fromCharCode(0x2460 + num - 1);
  return `(${num})`;
}

// クリップボード用テキスト生成
export function updateClipboardText(textarea: HTMLTextAreaElement, pairs: ConfirmedPair[]): void {
  const format = (val: number) => val.toFixed(6);
  const lines = pairs.map(p => 
    `${format(p.pointA.lat)},${format(p.pointA.lng)},${format(p.pointB.lat)},${format(p.pointB.lng)},1`
  );
  textarea.value = lines.join('\n');
}

// リストUIの安全な描画（innerHTML排除版）
export function renderPairList(
  container: HTMLDivElement,
  listEl: HTMLDivElement,
  pairs: ConfirmedPair[],
  handlers: {
    onMove: (idx: number, dir: number) => void;
    onDelete: (idx: number) => void;
    onPan: (pair: ConfirmedPair) => void;
  }
): void {
  if (pairs.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  listEl.textContent = ''; // 既存の要素を安全にクリア

  const format = (val: number) => val.toFixed(6);

  pairs.forEach((pair, idx) => {
    const numStr = getCircledNumber(pair.originalIndex);
    
    // リストアイテム（箱）
    const item = document.createElement('div');
    item.className = 'pair-item';
    item.style.cursor = 'pointer';
    const coordInfoA = `A: ${format(pair.pointA.lat)}, ${format(pair.pointA.lng)}`;
    const coordInfoB = `B: ${format(pair.pointB.lat)}, ${format(pair.pointB.lng)}`;
    item.title = `地点${numStr} (${coordInfoA} / ${coordInfoB}) - クリックで中央に移動`;
    item.addEventListener('click', () => handlers.onPan(pair));

    // タイトル
    const titleSpan = document.createElement('span');
    titleSpan.className = 'pair-title';
    titleSpan.textContent = `地点${numStr}`;

    // アクションボタンコンテナ
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'pair-actions';

    // ▲ボタン
    const btnUp = document.createElement('button');
    btnUp.className = 'btn-up';
    btnUp.textContent = '▲';
    btnUp.disabled = idx === 0;
    btnUp.addEventListener('click', (e) => { e.stopPropagation(); handlers.onMove(idx, -1); });

    // ▼ボタン
    const btnDown = document.createElement('button');
    btnDown.className = 'btn-down';
    btnDown.textContent = '▼';
    btnDown.disabled = idx === pairs.length - 1;
    btnDown.addEventListener('click', (e) => { e.stopPropagation(); handlers.onMove(idx, 1); });

    // 削除ボタン
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del';
    btnDel.textContent = '削除';
    btnDel.addEventListener('click', (e) => { e.stopPropagation(); handlers.onDelete(idx); });

    actionsDiv.appendChild(btnUp);
    actionsDiv.appendChild(btnDown);
    actionsDiv.appendChild(btnDel);

    item.appendChild(titleSpan);
    item.appendChild(actionsDiv);
    listEl.appendChild(item);
  });
}
