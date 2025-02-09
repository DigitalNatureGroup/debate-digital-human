const Replicate = require("replicate");
const fs = require("fs").promises;
const path = require("path");

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end(); // Method Not Allowed
    return;
  }

  const participant = req.body.participant;
  const tts_url = req.body.tts_url;

  try {
    // ローカルの顔画像を読み込み、データURIに変換
    const faceImagePath = path.join(process.cwd(),'public', 'persona', participant, 'face.jpg');
    const faceImageData = await fs.readFile(faceImagePath);
    const faceImageBase64 = faceImageData.toString('base64');
    const faceImageDataURI = `data:image/jpeg;base64,${faceImageBase64}`;
    //console.log(faceImageDataURI);

    // ローカルの音声ファイルを読み込み、データURIに変換
    const audioFilePath = tts_url;
    console.log("audioFilePath: ", audioFilePath);
    //audioFilePathを参照してなかったらエラー
    const audioData = await fs.readFile(audioFilePath);
    if(audioData.length === 0 || audioData === null){ 
      res.status(200).json({ error: '音声ファイルが存在しません。' });
      return;
    }
    const audioBase64 = audioData.toString('base64');
    const audioDataURI = `data:audio/wav;base64,${audioBase64}`; // 音声ファイルのMIMEタイプを適切に設定

    console.log("Creating lipsync video...");

    const output = await replicate.run(
      "devxpy/cog-wav2lip:8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef",
      {
        input: {
          face: faceImageDataURI,
          audio: audioDataURI,
        },
      }
    );

    console.log("Lipsync video created.");
    console.log(output);
    res.status(200).json({ video_url: output });
  } catch (error) {
    console.error("Error creating lipsync video:", error);
    res.status(500).json({ error: "Failed to create lipsync video." });
  }
}
