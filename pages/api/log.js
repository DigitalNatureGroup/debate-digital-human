const fs = require('fs');
import { getCurrentDate } from '../../lib/dateUtils';

export default async function handler(req, res) {
  // postじゃないならエラー
  if (req.method !== 'POST') {
    res.status(405).end(); //Method Not Allowed
    return;
  }

  const messages = req.body.messages; // JSON
  const chatCompletionTime = req.body.chat_completion_time; // int
  const ttsTime = req.body.tts_time; // int
  const lipsyncTime = req.body.lipsync_time; // int
  const totalTime = chatCompletionTime + ttsTime + lipsyncTime; // int

  const fileName = getCurrentDate() + '.json';
  const filePath = 'public/result/logs/' + fileName;

  const log = {
    messages: messages,
    chat_completion_time: chatCompletionTime,
    tts_time: ttsTime,
    lipsync_time: lipsyncTime,
    total_time: totalTime,
  };

  fs.writeFile(filePath, JSON.stringify(log), (err) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: err });
      return;
    }
    console.log(`log written to file: ${filePath}`);
    res.status(200).json({
      file_path: filePath,
    })
  });
}

