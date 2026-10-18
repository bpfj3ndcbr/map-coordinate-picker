# Map Coordinate Picker (v1.0.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey.svg)]()

地図上で指定した2地点（A-B間）の経度・緯度座標を取得・確認し、クリップボードへ簡単にエクスポートできるデスクトップアプリケーションです。国内主要サーキットのプリセットジャンプ機能や、座標対の順序管理機能を備えています。

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

## 📦 インストールと実行 (Downloads)

### 配布パッケージ（.dmg / .exe）から実行

[Releases ページ](https://github.com/your-username/map-coordinate-picker/releases) からお使いのOSに合わせたインストーラーをダウンロードしてください。

- **macOS (Apple Silicon)**: `Map Coordinate Picker-1.0.0-arm64.dmg`
- **Windows**: `Map Coordinate Picker Setup 1.0.0.exe`

> **⚠️ macOS での初回起動時の注意**  
> 本アプリは個人開発のオープンソースソフトウェアであるため、Appleの有料開発者証明書によるコード署名を行っていません。  
> 初回起動時に「開発元を検証できないため開けません」というセキュリティ警告が表示される場合は、以下の手順で起動してください。  
> 1. Finder で「アプリケーション」フォルダ内の `Map Coordinate Picker` を探します。  
> 2. `Control` キーを押しながらアプリをクリック（または右クリック）し、**「開く」** を選択します。  
> 3. 表示されるダイアログで再度 **「開く」** をクリックします（次回以降は通常通り起動します）。

---

## 🛠️ 開発環境とビルド (Development & Build)

本プロジェクトは Node.js, TypeScript, Vite, Leaflet, Electron で構築されています。

### 前提条件
- Node.js (v18 以上推奨)
- npm

### 開発環境の起動

```bash
# リポジトリのクローン
git clone [https://github.com/your-username/map-coordinate-picker.git](https://github.com/your-username/map-coordinate-picker.git)
cd map-coordinate-picker

# 依存パッケージのインストール
npm install

# Vite 開発サーバーの起動
npm run dev

# Electron 開発モードでの起動
npm run electron:dev
```

### アプリケーションのビルド

```bash
# TypeScript コンパイルおよび Web 成果物のビルド
npm run build

# macOS (Apple Silicon arm64) 用配布パッケージの生成 (.dmg)
npm run dist:mac

# Windows 用配布パッケージの生成 (.exe)
npm run dist:win
```

---

## 🤝 コントリビュート (Contributing)

本プロジェクトへのプルリクエスト、バグ報告、新機能のご提案などのコントリビュートを歓迎します！

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
