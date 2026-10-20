const { app, BrowserWindow } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');

function createWindow() {
  // ウィンドウの状態を管理するオブジェクトを生成（デフォルトサイズを指定）
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1100,
    defaultHeight: 750
  });

  // windowStateKeeper から前回の x, y, width, height を取得して適用
  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // ウィンドウのサイズ変更や移動イベントを監視して保存
  mainWindowState.manage(mainWindow);

  // Viteの開発サーバーURLがある場合はそちらを、本番ビルド時はローカルファイルを読み込む
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
