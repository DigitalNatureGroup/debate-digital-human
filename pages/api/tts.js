// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

// Import other required libraries
const fs = require('fs');
const util = require('util');
// Creates a client
const client = new textToSpeech.TextToSpeechClient();

export default async function handler(req, res) {
  // postじゃないならエラー
  if (req.method !== 'POST') {
    res.status(405).end(); //Method Not Allowed
    return;
  }

  const text = req.body.text;
  const gender = req.body.gender;

  // genderによって声を変える
  const voiceName = gender === 'female' ? 'ja-JP-Standard-B' : 'ja-JP-Neural2-C';
  console.log(gender, text);

  if (getByteLength(text) > 5000) {
    res.status(200).json({ error: '文字数が5000文字を超えています。' });
    return;
  }

  const request = {
    input: {text: text},
    voice: {
      languageCode: 'ja-JP',
      // name: 'ja-JP-Neural2-B', // ニューラル（女性）
      // name: 'ja-JP-Neural2-C', // ニューラル（男性）
      // name: 'ja-JP-Neural2-D', // ニューラル（男性）
      // name: 'ja-JP-Standard-A' // 標準（女性）
      // name: 'ja-JP-Wavenet-A' // WaveNet（女性）
      // ssmlGender: 'NEUTRAL'
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  // Write the binary audio content to a local file
  const writeFile = util.promisify(fs.writeFile);

  // 一意なファイル名を生成
  const fileName = getCurrentDate() + '.mp3';
  const filePath = 'public/result/tts/' + fileName;

  // ディレクトリが存在するか確認して，なければ作る
  if(!fs.existsSync('public/result/tts')) {
    fs.mkdirSync('public/result/tts', { recursive: true
    });
  }

  await writeFile(filePath, response.audioContent, 'binary');
  console.log(`Audio content written to file: ${filePath}`);
  await uploadFile(filePath);
  console.log(`Audio content uploaded to file: ${filePath}`);
  res.status(200).json({
    file_path: filePath,
    tts_url: `https://storage.googleapis.com/dh-tts-bucket/${filePath}`
  });
}

async function uploadFile(filePath) {
  const options = {
    destination: filePath,
    preconditionOpts: {ifGenerationMatch: 0},
  };

  await storage.bucket(bucketName).upload(filePath, options);
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

function getByteLength(str) {
  return encodeURI(str).split(/%..|./).length - 1;
}
