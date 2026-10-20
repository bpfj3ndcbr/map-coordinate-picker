# Map Coordinate Picker (v1.0.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey.svg)]()

地図上で指定した2地点（A-B間）の経度・緯度座標を取得・確認し、クリップボードへ簡単にエクスポートできるデスクトップアプリケーションです。国内主要サーキットのプリセットジャンプ機能や、座標対の順序管理機能を備えています。

本アプリは、作者:oud0n様が公開している **[LapLoupe(旧名 DS Universal)](https://github.com/oud0n/ds_universal)** の「コース編集/コース・計測ライン編集」や「コースフォルダー一括設置」機能でセクター位置情報として取り込み可能な、デジスパイス用セクターファイル（`.sci`）への記述内容を出力・表示する目的で開発しました。

- 出力されたテキストをコピー＆ペーストして `.sci` ファイルに追記することで、そのまま利用可能です。
- DS Universal Suite だけでなく、おそらくデジスパイス本体でもそのままお使いいただけます。

---

## ブラウザー版

github.io 上で動作確認できます。

Web: <https://bpfj3ndcbr.github.io/map-coordinate-picker/>

---

## 画面

アプリ版のスクリーンショットです。

<img width="1000" height="600" alt="mcp-tool-screenshot" src="https://github.com/user-attachments/assets/69f796e5-ade8-4308-87a8-3e55853b78fb" />

---

## 🌟 主な機能

- **地点A・Bの簡単プロット**: 地図上をクリックするだけで、計測ラインの基準となる2地点（A点・B点）を直感的に設定できます
- **ドラッグによる微調整と平行移動**: 登録後のラインは地図上で右クリックしていつでも再編集が可能です。A・Bそれぞれの地点をマウスでドラッグして位置を微調整できるほか、ラインの角度や幅（距離）を保ったまま、ペア全体を平行移動させることもできます。
- **作成済みラインのリスト管理**: 作成した座標データは画面上のリストに一覧表示されます。作成順序の入れ替え（▲/▼）や不要なラインの削除ができるほか、リスト内の項目をクリックすると、地図がその場所へ自動で移動（ズーム）します。
- **コピーしてすぐ使えるデータ出力**: 登録したすべてのライン情報を `A緯度,A経度,B緯度,B経度,1` の .sci フォーマットで一括コピー。そのままセクターファイル（`.sci`）に貼り付けて使用できます。
- **主要サーキットへのワンタッチ移動**: 富士スピードウェイ、鈴鹿サーキットなど、国内13カ所の主要サーキットへドロップダウンメニューから瞬時にジャンプできます。
- **住所での検索**: 任意の地名を入力して、目的の場所へ素早く地図を移動できます。
- **快適な作業環境**:
  - **ウィンドウ状態の記憶**: アプリを起動すると、前回終了時と同じウィンドウサイズ・配置で開くため、すぐに作業を再開できます。
  - **半透明パネル**: 操作パネルはマウスカーソルを外すと自動的に半透明になり、背後の地図を広く見渡せる設計になっています。
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
# 依存パッケージのインストール
npm install

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
