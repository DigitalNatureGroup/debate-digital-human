## 1. 事前準備

### 環境変数の設定

1. プロジェクトルートに.env.localファイルを作成し、以下の4つの変数を登録してください。各APIキーはご自身で用意してください。

| API-KEY | 説明 | 入手先 |
| --- | --- | --- |
|`NEXT_PUBLIC_OPENAI_API_KEY` | 回答を生成するためのOpenAIのAPIキー | https://openai.com/index/openai-api/ |
| `REPLICATE_API_TOKEN` | ripsync動画を生成するための推論サービスReplicateのAPIキー | https://replicate.com/home |
| `FACE_IMAGE_BASE_URL` | デジタルヒューマン画像が配置されたフォルダ | `https://localhost:3000/persona`と設定 |
| `GCS_BUCKET_NAME` | Google Cloud Storageで使用するバケット名 | 任意のバケット名を設定 |
| `TEAM_NAME` | チーム名を表示するための文字列 | 任意の名称 |

デジタルヒューマンの名前は`participants.json`に記載された`name`フィールドから取得します。

### Google Cloud APIsのADC設定

アプリケーションでは、Google Cloud APIsのText-to-Speech APIを利用しています。これを利用するために、アプリケーションのデフォルト認証情報（ADC:Application Default Credentials）の設定が必要です。  
以下のリンクに沿ってADC認証を実施してください:  
[ADC認証の手順 (Google Text-to-Speech クライアントライブラリ)](https://cloud.google.com/text-to-speech/docs/libraries?hl=ja#client-libraries-install-nodejs)

※ 認証を行わないと、Google Cloud APIs関連のエラーが発生します。

【手順の概要】

1. ADCのインストール  
2. ADCで認証（例: `gcloud auth` コマンドを使用）  
3. gcloud上でプロジェクトの作成  
4. 作成したプロジェクト内でText-to-Speech APIを有効化

### Google Cloud Storageの設定

1. 使用するバケットを作成してください。バケット名は任意です。環境変数`GCS_BUCKET_NAME`に設定します。
2. バケットに対して、ロール `roles/storage.objectUser` を付与してください。

### npmモジュールのインストール

ターミナルで以下のコマンドを実行してください。
```
  npm install
```

---

## 2. 実行
### 起動
事前準備が完了したら、以下のコマンドでアプリケーションを起動します。
```
  npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開いて、アプリケーションを確認してください。

### 操作方法
1. "Start"を押す（マイクの許可が求められることがあります）
2. マイクからデジタルヒューマンにむかって話す
3.  話す内容が終わったら"Chat"を押す
4. 回答が返ってくるまで30秒程度待つ

※"Stop"はマイクOFF機能です。"Chat"を押すとマイクはOFFになります。

### ペルソナの設定
`public/persona`にペルソナの情報があります。
ペルソナを切り替えることでディベートのテーマや肯定・否定を選択できます。
- Documents - RAGに入れる情報はこのディレクトリに入れてください。
- face.jpg - デジタルヒューマンの顔写真です。
- system_prompt_template.txt - システムプロンプトです。主にディベートの流れを記述しています。
- interview_transcript.txt - インタビュースクリプトです。ペルソナの口調や人格等の属性を定義します。ディベートでは必須ではありません。

ペルソナを追加するときは`perticipants.json`に`id`、`name`、`gender`を追加してください。

---

## 3. 補足情報

### リップシンク（唇と音声の同期）

- 詳細情報およびデモは、以下のリンクから確認できます。
  - [ReplicateのPlayground](https://replicate.com/devxpy/cog-wav2lip)
  - [使用しているモデル：Wav2Lip](https://github.com/Rudrabha/Wav2Lip?tab=readme-ov-file)

### テキストから音声を生成 (Text-to-Speech)

- Google CloudのText-to-Speech APIを使用しています。詳細および設定方法は以下のリンクを参照してください。
  - [Google Text-to-Speech AI](https://cloud.google.com/text-to-speech?hl=ja)

### 音声からテキストを生成（Speech-to-Text）
- Reactの音声認識ライブラリreact-speech-recognitionを使用しています．