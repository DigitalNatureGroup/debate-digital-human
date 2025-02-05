## 1. 事前準備

### 環境変数の設定

1. プロジェクトルートに.env.localファイルを作成し、以下の3つの変数を登録してください。各APIキーはご自身で用意してください。

   - NEXT_PUBLIC_OPENAI_API_KEY (OpenAIのAPIキー)
   - REPLICATE_API_TOKEN (ReplicateのAPIキー)
   - FACE_IMAGE_BASE_URL (例: `http://localhost:3000/personal`)

### Google Cloud APIsのADC設定

アプリケーションでは、Google Cloud APIsのText-to-Speech APIを利用しています。これを利用するために、アプリケーションのデフォルト認証情報（ADC）の設定が必要です。  
以下のリンクに沿ってADC認証を実施してください:  
[ADC認証の手順 (Google Text-to-Speech クライアントライブラリ)](https://cloud.google.com/text-to-speech/docs/libraries?hl=ja#client-libraries-install-nodejs)

※ 設定を行わないと、Google Cloud APIs関連のエラーが発生します。

【手順の概要】

1. ADCのインストール  
2. ADCで認証（例: `gcloud auth` コマンドを使用）  
3. gcloud上でプロジェクトの作成  
4. 作成したプロジェクト内でText-to-Speech APIを有効化

### Google Cloud Storageの設定

1. 使用するバケットを作成してください。
2. バケットに対して、ロール `roles/storage.objectUser` を付与してください。

### npmモジュールのインストール

ターミナルで以下のコマンドを実行してください。
```
  npm install
```

---

## 2. 起動

事前準備が完了したら、以下のコマンドでアプリケーションを起動します。
```
  npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開いて、アプリケーションを確認してください。

---

## 3. 補足情報

### リップシンク（唇と音声の同期）

- 詳細情報およびデモは、以下のリンクから確認できます。
  - [ReplicateのPlayground](https://replicate.com/devxpy/cog-wav2lip)
  - [使用しているモデル：Wav2Lip](https://github.com/Rudrabha/Wav2Lip?tab=readme-ov-file)

### テキストから音声を生成 (Text-to-Speech)

- Google CloudのText-to-Speech APIを使用しています。詳細および設定方法は以下のリンクを参照してください。
  - [Google Text-to-Speech AI](https://cloud.google.com/text-to-speech?hl=ja)