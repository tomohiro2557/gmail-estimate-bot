# gmail-estimate-bot
Gmailの見積依頼メールを自動取得し、AI（Gemini）でAWSの概算見積を生成・Slackへ通知する業務自動化ボット。

## 🚀 概要

- Gmailの特定ラベル（例：`ESTIMATE`）に届いた見積依頼メールを検知
- Gemini APIで概算見積を生成
- Slackへ通知
- 処理済みメールには `DONE_ESTIMATE` ラベルを付与

---

## 🧰 事前準備

- Googleアカウント
- Slack Incoming Webhook URL
- Gemini APIキー
- Google Apps Script プロジェクト

---

## ⚙️ セットアップ手順

### 1. Apps Scriptを作成

1. https://script.google.com にアクセス
2. 新規プロジェクトを作成
3. 本リポジトリのコードを貼り付け

---

### 2. スクリプトプロパティを設定

Apps Script → ⚙（プロジェクト設定）→「スクリプト プロパティ」に以下を追加：

| キー | 値 |
|------|----|
| `GEMINI_API_KEY` | GeminiのAPIキー |
| `SLACK_WEBHOOK_URL` | SlackのIncoming Webhook URL |
| `CONFIG_FILE_ID` | Drive上のプロンプトファイルID |

---

### 3. Driveにプロンプトファイルを作成

1. テキストファイル（例：`prompt.txt`）を作成
2. 見積生成用プロンプトを記載
3. ファイルIDを取得
4. `CONFIG_FILE_ID` に設定

---

### 4. Gmailラベルを作成

- Gmailで `Price` ラベルを作成
- 見積依頼メールにそのラベルを付与

---

### 5. 初回実行（権限承認）

1. `pollPriceLabelAndNotifySlack()` を実行
2. Gmail / Drive / 外部通信の権限を承認

---

### 6. トリガー設定（自動実行）

Apps Script → トリガー →  
`pollPriceLabelAndNotifySlack` を定期実行（例：5分ごと）

---

## 🔄 動作フロー

1. `Price` ラベル付きメールを検索
2. 本文を抽出・整形
3. Gemini APIへ送信
4. 概算見積を生成
5. Slackへ通知
6. `AI_SUMMARIZED_PRICE` ラベルを付与
