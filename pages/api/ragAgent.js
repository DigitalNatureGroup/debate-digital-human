import { RagAgent } from "../../lib/ragAgent";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      question,
      docPath: providedDocPath,       // リクエストから渡された docPath
      systemPrompt: providedSystemPrompt, // リクエストから渡された systemPrompt
    } = req.body;

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    // 指定がなければデフォルト値を利用
    const docPath = providedDocPath || "public/documents";
    const systemPrompt = providedSystemPrompt || "You're a helpful assistant.";

    // シングルトンインスタンスを取得（パラメータが変更されている場合は再初期化）
    const agent = await RagAgent.getInstance(apiKey, docPath, systemPrompt);

    // 質問に対する回答を取得
    const answer = await agent.ask(question);

    return res.status(200).json({ answer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}