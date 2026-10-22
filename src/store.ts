import { PointCoord, PairData } from './types';

// 状態が変更された際に呼び出されるリスナー関数の型
export type StoreListener = () => void;

export class CoordinateStore {
  private pairs: PairData[] = [];
  private totalCreatedCount = 0;
  private listeners: StoreListener[] = [];
  
  // UI編集中の排他制御（既存の isEditing フラグと同等）
  public isEditing: boolean = false;

  // --------------------------------------------------
  // 購読（通知）システム
  // --------------------------------------------------
  public subscribe(listener: StoreListener): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // --------------------------------------------------
  // データの取得
  // --------------------------------------------------
  public getPairs(): PairData[] {
    // 意図しない直接変更を防ぐため、コピーを返す
    return [...this.pairs];
  }

  // --------------------------------------------------
  // データの操作（追加・更新・削除）
  // --------------------------------------------------
  public addPair(pointA: PointCoord, pointB: PointCoord): PairData {
    this.totalCreatedCount++;
    const newPair: PairData = {
      id: `pair-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      originalIndex: this.totalCreatedCount,
      pointA: { ...pointA },
      pointB: { ...pointB }
    };
    
    this.pairs.push(newPair);
    this.notify();
    return newPair;
  }

  public updatePair(id: string, pointA: PointCoord, pointB: PointCoord): void {
    const pair = this.pairs.find(p => p.id === id);
    if (pair) {
      pair.pointA = { ...pointA };
      pair.pointB = { ...pointB };
      this.notify();
    }
  }

  public deletePair(id: string): void {
    this.pairs = this.pairs.filter(p => p.id !== id);
    this.notify();
  }

  public movePairOrder(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.pairs.length) return;
    
    // 配列の要素を入れ替える
    const temp = this.pairs[index];
    this.pairs[index] = this.pairs[newIndex];
    this.pairs[newIndex] = temp;
    
    this.notify();
  }

  public clearAll(): void {
    this.pairs = [];
    this.totalCreatedCount = 0;
    this.isEditing = false;
    this.notify();
  }
}