import { PairData } from './types';

export function getDisplayNumber(num: number): string {
  return String(num);
}

export function updateClipboardText(textarea: HTMLTextAreaElement, pairs: PairData[]): void {
  const format = (val: number) => val.toFixed(6);
  const lines = pairs.map(p => 
    `${format(p.pointA.lat)},${format(p.pointA.lng)},${format(p.pointB.lat)},${format(p.pointB.lng)},1`
  );
  textarea.value = lines.join('\n');
}

export function renderPairList(
  container: HTMLDivElement,
  listEl: HTMLDivElement,
  pairs: PairData[],
  handlers: {
    onMove: (idx: number, dir: number) => void;
    onDelete: (id: string) => void; // indexではなく一意なidで削除を指示
    onPan: (pair: PairData) => void;
  }
): void {
  if (pairs.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  listEl.textContent = ''; 

  pairs.forEach((pair, idx) => {
    const numStr = getDisplayNumber(pair.originalIndex);
    
    const item = document.createElement('div');
    item.className = 'pair-item';
    item.title = `地点 ${numStr} (クリックで移動)`;
    item.addEventListener('click', () => handlers.onPan(pair));

    const titleSpan = document.createElement('span');
    titleSpan.className = 'pair-title';
    titleSpan.textContent = `地点 ${numStr}`;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'pair-actions';

    const btnUp = document.createElement('button');
    btnUp.className = 'btn-up';
    btnUp.textContent = '▲';
    btnUp.disabled = idx === 0;
    btnUp.addEventListener('click', (e) => { e.stopPropagation(); handlers.onMove(idx, -1); });

    const btnDown = document.createElement('button');
    btnDown.className = 'btn-down';
    btnDown.textContent = '▼';
    btnDown.disabled = idx === pairs.length - 1;
    btnDown.addEventListener('click', (e) => { e.stopPropagation(); handlers.onMove(idx, 1); });

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del';
    btnDel.textContent = '削除';
    btnDel.addEventListener('click', (e) => { e.stopPropagation(); handlers.onDelete(pair.id); });

    actionsDiv.appendChild(btnUp);
    actionsDiv.appendChild(btnDown);
    actionsDiv.appendChild(btnDel);

    item.appendChild(titleSpan);
    item.appendChild(actionsDiv);
    listEl.appendChild(item);
  });
}