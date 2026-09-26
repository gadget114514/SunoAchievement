# 進捗と引き継ぎメモ（P1–P4 完了）

このファイルはセッションをまたぐ引き継ぎ用です。仕様の本体は `doc/app-design.md`。実装はフェーズごとに1コミットです。

## 完了フェーズ

| Phase | コミット | 内容 |
|---|---|---|
| P1 Foundation | `ecacbac` | `scripts/check.js`、`npm test`、`renderer/js/format.js`、`renderer/js/platform.js`、`suno.js` の platform 経由化、`app.js` web モード、CSP、`.nojekyll`、Pages workflow |
| P2 Canvas card | `c5982ce` | `card/palette.js`、`card/canvas-card.js`（16:9/9:16、Path2D アイコン、OffscreenCanvas）、`file:save`/`image:fetch` IPC、分割保存ボタン、DOM snapshot 一式削除 |
| P3 SRT/script/tween | `b9de9a8` | `srt.js`、`script-gen.js`、`color.js`、`lyrics/rng.js`、`lyrics/easing.js`、`lyrics/tween.js` ＋ テスト6本とフィクスチャ |
| P4 Studio shell | `f0af872` | `studio.html`/`css`、`studio/project.js`、`store.js`、`io.js`、`menu.js`、`app.js`、`file:open`/`studio:open`/autosave/recent IPC、IndexedDB ハンドオフ、`studio.*` i18n 5言語 |

## 検証コマンド

```bash
npm run check                       # lib/, scripts/, renderer/js/ + main.js/preload.js、vendor は除外
npm test                            # 55 tests（node --test の glob 指定）
SA_SMOKE=1 npx electron .           # 基本フロー（@suno 取得、32バッジ、5言語）
SA_SMOKE=1 SA_SMOKE_SNAPSHOT=1 SA_SNAPSHOT_LANG=en npx electron .
                                    # 両アスペクトのカードを %TEMP%/suno-card-smoke-16x9.jpg / 9x16.jpg に出力
SA_SMOKE=1 SA_SMOKE_STUDIO=1 npx electron .
                                    # Studio: ハンドオフ、メニュー、undo/redo、台本生成、autosave 復元、studio i18n
```

ヘッドレス web 検証（P1/P2/P4 で使用。スクリプトは temp に都度作成して削除）:
1. `http.createServer` で `renderer/` を配信（例: 127.0.0.1:8123）
2. preload なしの `BrowserWindow`（`contextIsolation: true, sandbox: true`）で `http://127.0.0.1:8123/index.html` を読む
3. `SA.app.importFile(new File([JSON], 'x.json'))` → `#btn-studio` クリック → `studio.html#handoff` へ遷移
4. IndexedDB ハンドオフ、autosave 復元、レイアウト永続化、`console-message` のエラー0 を確認

注意: `SA_SMOKE_STUDIO` は `studio.html` へ遷移するため、`SA_SMOKE_ERRORS` と同時に使うと ERRORS が Studio ページ上で走る（順序の都合。片方ずつ使う）。

## 実装上の決定・仕様との差分

- **check 対象**: 仕様の3ディレクトリに加えて `main.js` / `preload.js` も対象（旧 check の範囲を維持）
- **test コマンド**: `node --test "scripts/test/**/*.test.js"`。Node 24 + Windows ではディレクトリ引数が壊れるため（doc §2 更新済み）
- **ドキュメント修正**: §7.11–7.17 の番号整理、§14/§15 入れ替え、elementPath 文法（beat 必須）、`evaluateBeat` に統一、`srt.parse` は `{cues, warnings}`、spans に `underline` 追加、フォントは `asset:read` IPC 方式（未実装・P5）、VP9 alpha は best-effort、`preserveDrawingBuffer` 注意、`previousCue` は end 時刻で再評価、es/fr/ru は v1 フォールバック
- **Tween**: 33 カーブ + `hold`（`names.length` は 34）。`tween.value(kind,a,b,p,ease)` / `tween.segment(track,t)`。色は OKLab。Elastic の定数は `2π/3` と `2π/4.5`（= 仕様の period 0.3 に相当。`2π/0.3` にすると InOut が非対称になるので禁止）
- **Color**: Oklab の `a` 軸と alpha の名前衝突を避けるため、`rgbToOklab` は `{L,a,b,alpha}` を返す
- **カード**: snapshot.css の実測値に一致（gap 9、r 12、locked 0.74、アバター 86 角丸 20）。参考画像とピクセル走査で ±1px 一致を確認。9:16 はヘッダー 580
- **アイコン**: バッジ10種 + verified の計11個を `Path2D` 化（doc は「9」と書いていたが実使用数に合わせた）
- **handoff**: Web は IndexedDB に書き `#handoff` で遷移し、読み出しは1回限り。Electron は `studio:open` → `loadFile` → `studio:data`
- **autosave**: Electron は `userData/studio-autosave.json`、Web は IndexedDB `sa-studio/autosave`
- **recent**: Electron は `userData/recent.json`、Web は `localStorage['sa.studio.recent']`。エントリに project JSON を保持して開き直せるようにした（仕様の「Web は autosave 一覧」の簡易版）
- **レイアウト永続化**: `localStorage['sa.studio.layout']`
- **Studio の未実装プレースホルダ**: media/inspector/timeline の本編集 UI、random/presets、動画書き出し。メニュー項目は無効化または「後のステップ」トースト
- **platform.js の未実装分**: `readAsset`（P5）、`openStream`（P11）、media put/get（P10c）。`loadImage`/`readFile`/`saveFile`/`openStudio`/autosave/recent は実装済み

## 主なファイル

- 共有: `renderer/js/{format,platform,suno,srt,script-gen,color}.js`
- カード: `renderer/js/card/{palette,canvas-card}.js`
- 純ロジック: `renderer/js/lyrics/{rng,easing,tween}.js`
- Studio: `renderer/js/studio/{project,store,io,menu,app}.js`、`renderer/studio.html`、`renderer/css/studio.css`
- テスト: `scripts/test/*.test.js`、`scripts/test/fixtures/{dataset.json,basic.srt,japanese.srt,fx.srt}`
- Electron: `main.js`（IPC: suno/cache/file:save・open/image:fetch/studio:open・autosave/recent）、`preload.js`

## 次: P5（Text → vector → GL）

仕様 §12 P5 と §6.3〜6.5・§8.1〜8.6・§10.5 を実装:
`lyrics/font.js`（`asset:read` でフォント読込・グリフ取得・layoutText）、`lyrics/geometry.js`（輪郭→三角形）、`lyrics/scene.js`、`gl/context.js`、`gl/shaders.js`、`gl/passes.js`（まず solid fill のテキストパス）、`lyrics/engine.js`、`studio/preview.js`（トランスポート）。受け入れ: 英日キューがベクターで描画、穴あき文字（A/B/8/あ/愛）が正しい、音声と再生位置が同期、WebGL2 無効時にフォールバックのバナー。

新セッション開始時の指示例: 「`doc/app-design.md` と `doc/progress.md` を読んで、P5 を実装して。完了したら npm run check / npm test / Electron smoke で検証し、1コミットにまとめて」。
