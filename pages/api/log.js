const fs = require('fs');

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

function getCurrentDate() {
  const currentDate = new Date();
  // 年
  const year = currentDate.getFullYear();
  // 月
  const month = currentDate.getMonth() + 1;
  // 日
  const day = currentDate.getDate();
  // 時間
  const hour = currentDate.getHours();
  // 分
  const min = currentDate.getMinutes();
  // 秒
  const sec = currentDate.getSeconds();
  // ミリ秒
  const msec = currentDate.getMilliseconds();

  const date =
    year + '-' +
    String(month).padStart(2, "0") + '-' +
    String(day).padStart(2, "0") + '-' +
    String(hour).padStart(2, "0") + '-' +
    String(min).padStart(2, "0") + '-' +
    String(sec).padStart(2, "0") + '-' +
    String(msec).padStart(3, "0");
  return date;
}
