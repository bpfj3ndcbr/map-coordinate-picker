# Map Coordinate Picker (v1.0.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey.svg)]()

地図上で指定した2地点（A-B間）の経度・緯度座標を取得・確認し、クリップボードへ簡単にエクスポートできるデスクトップアプリケーションです。国内主要サーキットのプリセットジャンプ機能や、座標対の順序管理機能を備えています。

本アプリは、作者:oud0n様が公開している **[DS Universal Suite](https://github.com/oud0n/ds_universal)** の「コース編集/コース・計測ライン編集」や「コースフォルダー一括設置」機能でセクター位置情報として取り込み可能な、デジスパイス用セクターファイル（`.sci`）への記述内容を出力・表示する目的で開発しました。

- 出力されたテキストをコピー＆ペーストして `.sci` ファイルに追記することで、そのまま利用可能です。
- DS Universal Suite だけでなく、おそらくデジスパイス本体でもそのままお使いいただけます。

---

## 🌟 主な機能

- **2地点（A-B）座標測定**: 地図上のクリックで地点A・Bを設定し、間を繋ぐベクトルラインと自動調整ラベルを表示。
- **インライン確定ワークフロー**: 地点選択時にポップアップから「確定」「確定して次へ」「取り消し」を直感的に操作。
- **確定ペアの一覧管理**: 確定済み座標対の順序入れ替え（▲/▼）、個別削除、クリックによる視点自動フォーカス（`panTo`）。
- **国内主要サーキット プリセット**: 富士スピードウェイ、鈴鹿サーキット、筑波サーキット、オートポリスなど主要13コースへワンクリックで移動。
- **国土地理院 住所・施設検索**: キーボード入力およびIME確定に対応したスムーズな地図移動（デバウンス・連動防止処理済み）。
- **クリップボード連携**: `A緯度,A経度,B緯度,B経度,1` フォーマットの座標テキストを一括コピー。
- **UIパネル透過処理**: マウスホバー時に不透明度100%、離れた際に70%へ自動調整し、下の地図視認性を確保。

---

## 🛠️ 開発環境とビルド (Development & Build)

本プロジェクトは Node.js, TypeScript, Vite, Leaflet, Electron で構築されています。

### 前提条件
- Node.js (v18 以上推奨)
- npm

### 開発環境の起動

```bash
# リポジトリのクローン
git clone https://github.com/bpfj3ndcbr/map-coordinate-picker.git
cd map-coordinate-picker

# 依存パッケージのインストール
npm install

# 起動方法その1 / プラウザで簡易的に確認

1. Vite 開発サーバーの起動
npm run dev

2. ブラウザで Vite 開発サーバ起動で出力された URL を開く

# 起動方法その2 / 簡易的にアプリとして確認
1. Electron 開発モードでの起動
ターミナルで
npm run dev

2. 別のターミナルで
npm run electron:dev

```

### アプリケーションのビルド

```bash
# TypeScript コンパイルおよび Web 成果物のビルド
npm run build

# macOS (Apple Silicon arm64) 用アプリの生成 (.app)
npm run dist:mac

release/mac-arm64/ フォルダに「Map Coordinate Picker.app」が作成される

# Windows 用配布パッケージの生成 (.exe)
npm run dist:win

(windows環境は未検証)


```


---

## 📜 ライセンス・利用規約と権利表記 (License & Credits)

### 1. 本アプリケーションのライセンス
本プロジェクトのソースコードは [MIT License](LICENSE.md) のもとで公開されています。商用・非商用を問わず自由にご利用・改変・再配布いただけます。

### 2. 地図タイルおよび検索データに関する権利表記
本アプリケーションでは、背景地図タイルおよび住所・施設検索機能に**国土地理院**の提供する地理院タイルおよびAPIを使用しています。

- **地理院タイル (淡色地図 / 土地利用図 / 写真等)**: [国土地理院](https://maps.gsi.go.jp/development/ichiran.html)  
  出典表記: 「国土地理院」（利用規約に基づきアプリケーション画面内に明記されています）
- **国土地理院 住所検索API**: [国土地理院 API利用規約](https://msearch.gsi.go.jp/) に準拠して利用しています。

### 3. 使用サードパーティライブラリ
- **Leaflet**: © Vladimir Agafonkin, BSD-2-Clause License
- **Electron**: © OpenJS Foundation, MIT License
- **Vite**: © Evan You & Vite Contributors, MIT License

各ライブラリのライセンス詳細および著作権表記については、同梱の THIRD-PARTY-NOTICES.txt をご参照ください。
