// 必要なモジュールのインポート（既存のコードと同様）
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { formatDocumentsAsString } from "langchain/util/document";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";

/**
 * RagAgent クラス
 * ・指定したドキュメントを読み込み、テキストをチャンクに分割
 * ・各チャンクをベクトル化してベクトルストア（HNSWLib）を作成
 * ・RunnableSequence により、質問・会話履歴・リトリーバルされたコンテキストから回答生成
 */
class RagAgent {
  /**
   * コンストラクタ
   * @param {string} apiKey - OpenAI の API キー
   * @param {string} docPath - 読み込むドキュメントのパス（ディレクトリ）
   * @param {string} systemPrompt - エージェントの行動を決定するシステムプロンプト
   */
  constructor(apiKey, docPath, systemPrompt) {
    this.apiKey = apiKey;
    this.docPath = docPath;
    this.systemPrompt = systemPrompt;
    this.chatHistory = "";
    this.chain = null;
    this.retriever = null;
  }

  // --- シングルトン用の static フィールド ---
  static instance = null;

  /**
   * シングルトンインスタンスを取得する静的メソッド
   * （Serverless環境の場合はコンテナ再生成時に初期化が再度行われます）
   * @param {string} apiKey 
   * @param {string} docPath 
   * @param {string} systemPrompt 
   * @returns {Promise<RagAgent>} 初期化済みの RagAgent インスタンス
   */
  static async getInstance(apiKey, docPath, systemPrompt) {
    // インスタンスが未生成の場合は新規作成
    if (!RagAgent.instance) {
      console.log("RagAgent の初期化を開始します...");
      RagAgent.instance = new RagAgent(apiKey, docPath, systemPrompt);
      await RagAgent.instance.initialize();
      console.log("RagAgent の初期化が完了しました。");
    } else {
      // 既存のインスタンスと初期化パラメータが異なる場合は再初期化する
      if (RagAgent.instance.docPath !== docPath ||
          RagAgent.instance.systemPrompt !== systemPrompt) {
        console.log("初期化パラメータが変更されたため、RagAgent を再初期化します...");
        RagAgent.instance = new RagAgent(apiKey, docPath, systemPrompt);
        await RagAgent.instance.initialize();
        console.log("RagAgent の再初期化が完了しました。");
      }
    }
    return RagAgent.instance;
  }

  async loadDirectory(doc_path) {
    const directoryLoader = new DirectoryLoader(doc_path, {
      ".pdf": (path) => new PDFLoader(path),
    });
    const directoryDocs = await directoryLoader.load();
    return directoryDocs;
  }

  /**
   * 初期化処理
   * ・ドキュメントの読み込み、テキストのチャンク化、ベクトルストアの生成、チェーンの構築
   * @param {number} chunkSize 
   * @param {number} chunkOverlap 
   */
  async initialize(chunkSize = 1000, chunkOverlap = 200) {
    console.log(`ドキュメントを ${this.docPath} から読み込み中...`);
    const text = await this.loadDirectory(this.docPath);
    console.log("ドキュメントの読み込み完了。");

    console.log("ドキュメントをチャンクに分割中...");
    const textSplitter = new RecursiveCharacterTextSplitter({
      separator: "\n",
      chunkSize: chunkSize,
      chunkOverlap: chunkOverlap,
    });
    const docs = await textSplitter.splitDocuments(text);
    console.log(`分割完了：${docs.length} 個のチャンクを作成しました。`);

    console.log("ベクトルストア作成中（埋め込み生成中）...");
    const embeddings = new OpenAIEmbeddings({ openAIApiKey: this.apiKey });
    const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    console.log("ベクトルストア作成完了。");

    this.retriever = vectorStore.asRetriever();

    const questionPrompt = PromptTemplate.fromTemplate(
      `SYSTEM PROMPT: {system_prompt}
Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
CONTEXT: {context}
----------------
CHAT HISTORY: {chatHistory}
----------------
QUESTION: {question}
----------------
Helpful Answer:`
    );
  
    const model = new ChatOpenAI({
      openAIApiKey: this.apiKey,
      modelName: "gpt-4o", // 必要に応じて変更
      temperature: 0.7,
    });
  
    this.chain = RunnableSequence.from([
      {
        question: (input) => input.question,
        chatHistory: (input) => input.chatHistory || "",
        system_prompt: () => this.systemPrompt,
        context: async (input) => {
          console.log("質問に対するコンテキストを取得中:", input.question);
          const relevantDocs = await this.retriever.invoke(input.question);
          const serialized = formatDocumentsAsString(relevantDocs);
          return serialized;
        },
      },
      questionPrompt,
      model,
      new StringOutputParser(),
    ]);

    console.log("RagAgent の内部チェーン構築完了。");
  }

  /**
   * 会話履歴の更新（新たな Q/A ペアを追加する）
   * @param {string} question 
   * @param {string} answer 
   * @returns {string} 更新後の会話履歴
   */
  updateChatHistory(question, answer) {
    const newInteraction = `Human: ${question}\nAI: ${answer}`;
    if (!this.chatHistory) {
      return newInteraction;
    }
    return `${this.chatHistory}\n\n${newInteraction}`;
  }

  /**
   * 質問を受け付け、回答を返す
   * @param {string} prompt 
   * @returns {Promise<string>} AI の回答
   */
  async ask(prompt) {
    if (!this.chain) {
      throw new Error("初期化が完了していません。initialize()を先に実行してください。");
    }
    console.log("質問を投げます:", prompt);
    const input = {
      question: prompt,
      chatHistory: this.chatHistory,
    };
    const answer = await this.chain.invoke(input);
    this.chatHistory = this.updateChatHistory(prompt, answer);
    console.log("回答:", answer);
    return answer;
  }
}

export { RagAgent };