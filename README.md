# ひろしさんダイエットアプリ（GitHub Pages運用版）

単一HTML・オフライン動作・外部送信ゼロの減量ダッシュボード。
iPhoneだけで公開・保守できる構成です。

## ファイル構成（すべて1階層・フォルダなし）
- index.html   アプリ本体（GitHub Pagesでこのまま公開される）
- app.test.js  自動テスト（品質ゲート・22項目）
- package.json テスト実行用（npm test）
- CLAUDE.md    Claude Codeへの保守指示書（不変条件・更新手順）
- README.md    このファイル

## 公開（初回のみ）
1. このリポジトリの Settings → Pages → Branch: main / (root) → Save
2. 数分後に https://ユーザー名.github.io/リポジトリ名/ で公開される
3. そのURLをiPhoneのホーム画面に追加

## 月1メンテ（Claude Code on the web）
1. iPhoneのClaudeアプリ → Code タブ → このリポジトリを選択
2. プロンプト例：
   「CLAUDE.mdの手順に従って知識ベースを最新の運動生理学・栄養学に更新して。
    npm testが全件パスすることを確認してから完了して」
3. 変更内容を確認してマージ → GitHub Pagesが自動で再デプロイ

## 注意
- 公開URLは誰でも開けるが、体重などの記録データは各端末のブラウザ内のみで外部送信されない
- URLを変えた場合は旧URLで「バックアップ書き出し」→新URLで「バックアップ読み込み」
