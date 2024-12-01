# リアルタイム音声文字起こしシステム

## 実行環境

- Node.js (v14.0.0 以上, 自分の環境:16.20.0)
- npm (v6.0.0 以上, 自分の環境:7.24.2)
- ffmpeg (テスト音声変換用)

## 必要なパッケージ

- express
- socket.io
- @aws-sdk/client-transcribe-streaming

## インストール方法

1. プロジェクトの初期化:
   run `npm init -y`

2. 必要なパッケージのインストール:
   run `npm install express socket.io @aws-sdk/client-transcribe-streaming`

## 実行準備

1. AWS の認証情報を設定してください
2. 環境変数の設定(確認用の key を残りましたが、確認後削除してください):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

## 実行方法

サーバーを起動:
run `node server.js`

## テストの実行方法

### テスト用音声ファイルの準備(提供される)

IBM 提供のサンプル音声ファイルを PCM 形式に変換する場合:
run `ffmpeg -i ja-JP_Broadband-sample.wav -f s16le -acodec pcm_s16le -ar 44100 -ac 1 ja-JP_Broadband-sample.raw`

### テストの実行

run `node server_test.js`

## 注意事項

- 音声入力は 16kHz、16 ビット、モノラル形式の PCM データである必要があります
- ブラウザは WebSocket をサポートしている必要があります

## トラブルシューティング

1. 音声が認識されない場合

   - マイクの権限設定を確認してください
   - 入力デバイスが正しく選択されているか確認してください
   - socket.io のインストールを確認してください

2. 接続エラーが発生する場合
   - AWS の認証情報が正しく設定されているか確認してください
   - ネットワーク接続を確認してください
