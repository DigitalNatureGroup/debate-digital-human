import Head from 'next/head';
import Image from 'next/image';
import styles from '@/styles/Home.module.css';
import "regenerator-runtime";
import { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import fsPromises from 'fs/promises';
import path from 'path';

// ディベートの進行段階
const STAGES = [
  '肯定側立論',
  '否定側反対尋問',
  '否定側立論',
  '肯定側反対尋問',
  '否定側反駁',
  '肯定側反駁',
  '否定側最終弁論',
  '肯定側最終弁論',
];

// システムプロンプト生成用のヘルパー関数
function generateSystemPrompt(name, systemTemplate, interviewTranscript, stage) {
  return `${systemTemplate}

## 現在のディベート段階
今は「${stage}」です。

### 対話データ
\`\`\`
${interviewTranscript}
\`\`\`

大変重要必ず守れ**回答は300文字程度で生成しなさい**大変重要必ず守れ`;
}

export default function Home({ faceImageBaseUrl, participantData, teamName }) {
  // 初期選択は participants.json 内の最初のペルソナ
  const initialParticipant = participantData.participants[0];
  const [selectedParticipant, setSelectedParticipant] = useState(initialParticipant.id);
  const [selectedStage, setSelectedStage] = useState(STAGES[0]);
  // 初期プロンプトは各ペルソナの system_template と interview_transcript ファイルから生成する
  const [messages, setMessages] = useState([
    { role: 'system', content: generateSystemPrompt(initialParticipant.name, initialParticipant.system_template, initialParticipant.interview_transcript, STAGES[0]) }
  ]);
  const [gender, setGender] = useState(initialParticipant.gender);
  const [urls, setUrls] = useState({ audioUrl: '', videoUrl: '' });
  const digitalHumanName = participantData.participants.find(p => p.id === selectedParticipant)?.name || '';

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const startButton = useRef(null);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const [inputText, setInputText] = useState('');

  if (!browserSupportsSpeechRecognition) {
    console.log("Speech Recognition is not supported.");
  } else {
    console.log("Speech Recognition is supported.");
  }

  useEffect(() => {
    setInputText(transcript);
  }, [transcript]);

  useEffect(() => {
    if (videoRef.current && urls.videoUrl) {
      videoRef.current.load();
      audioRef.current.src = urls.audioUrl;
      audioRef.current.play()
        .then(() => {
          // 音声再生開始後1秒で動画再生
          setTimeout(() => {
            videoRef.current.play();
          }, 1000);
        })
        .catch(error => console.error('Audio playback failed', error));
    }
  }, [urls]);

  async function chat() {
    // 計測開始
    const startTime = new Date();

    const resultText = inputText;

    // 選択中のペルソナ情報を取得
    const currentPersona = participantData.participants.find(p => p.id === selectedParticipant);
    // ペルソナに合わせたドキュメントのパスとシステムプロンプトを生成
    // ここでは、各ペルソナ用のドキュメントが public/persona/{participant.id} 以下にある前提です
  const docPath = `public/persona/${currentPersona.id}/documents`;
  const systemPrompt = generateSystemPrompt(
      currentPersona.name,
      currentPersona.system_template,
      currentPersona.interview_transcript,
      selectedStage
  );

    // 現在の会話履歴にユーザーの発言を追加
    const newMessages = [...messages, { role: 'user', content: resultText }];
    console.log("User message:", resultText);
    resetTranscript();
    setInputText('');
    // Start ボタン 5秒間無効にする
    startButton.current.disabled = true;

    // API に送信するペイロードに、question に加えて docPath と systemPrompt を含める
    const payload = {
      question: resultText,
      docPath,
      systemPrompt
    };

    console.log('payload:', payload);
    console.log('wait for chat completion...');

    let responseMessage = "";
    try {
      const response = await fetch("api/ragAgent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("ragAgent connection Error.");
      }
      const data = await response.json();
      responseMessage = data.answer;
      console.log("responseMessage:", responseMessage);
    } catch (error) {
      console.error("Error:", error);
    }

    const chatCompletionTime = new Date() - startTime;
    const updatedMessages = [...newMessages, responseMessage];
    setMessages(updatedMessages);
    console.log("Updated messages:", updatedMessages);

    const ttsRes = await text2audio(responseMessage);
    if (ttsRes.error) {
      console.log(ttsRes.error);
      return;
    }
    const ttsTime = new Date() - startTime - chatCompletionTime;
    const tts_url = ttsRes.file_path; 
    const video_url = await audio2video(tts_url);
    const lipsyncTime = new Date() - startTime - chatCompletionTime - ttsTime;

    console.log(`video_url: ${video_url}`);
    setUrls({
      audioUrl: tts_url.replace('public/', ''),
      videoUrl: video_url,
    });

    // 送信内容と時間情報をログとして保存
    const saveLogRes = await saveLog(updatedMessages, chatCompletionTime, ttsTime, lipsyncTime);
    console.log(`log_file_path: ${saveLogRes.file_path}`);
    startButton.current.disabled = false;
  }

  async function saveLog(messages, chatCompletionTime, ttsTime, lipsyncTime) {
    const res = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        chat_completion_time: chatCompletionTime,
        tts_time: ttsTime,
        lipsync_time: lipsyncTime,
      }),
    });
    return await res.json();
  }

  async function text2audio(text) {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, gender }),
    });
    return await res.json();
  }

  async function audio2video(tts_url) {
    const res = await fetch('/api/lipsync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant: selectedParticipant,
        tts_url,
      }),
    });
    const result = await res.json();
    return result.video_url;
  }

  function handleStageChange(e) {
    const stage = e.target.value;
    setSelectedStage(stage);
    const currentPersona = participantData.participants.find(p => p.id === selectedParticipant);
    setMessages([
      { role: 'system', content: generateSystemPrompt(currentPersona.name, currentPersona.system_template, currentPersona.interview_transcript, stage) }
    ]);
  }

  async function handleSelectChange(e) {
    const idx = e.target.selectedIndex;
    const personalData = participantData.participants[idx];
    setSelectedParticipant(personalData.id);
    setGender(personalData.gender);
    // 選択したペルソナのシステムプロンプトを再生成して上書き
    setMessages([
      { role: 'system', content: generateSystemPrompt(personalData.name, personalData.system_template, personalData.interview_transcript, selectedStage) }
    ]);
  }

  return (
    <div>
      <Head>
        <title>Debate AI App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <div className={styles.mainDisplayArea}>
          <div className={styles["info-area"]}>
            <p className={styles.teamNameText}>{teamName}</p>
            <p className={styles.digitalHumanNameText}>{digitalHumanName}</p>
          </div>
          <div className={styles["video-area"]}>
            {urls.videoUrl ? (
              <>
                <audio ref={audioRef} style={{ display: 'none' }}></audio>
                <video ref={videoRef} width="900" height="600" muted onEnded={() => {
                  setTimeout(() => {
                    startButton.current.disabled = false;
                  }, 30000);
                }}>
                  <source src={urls.videoUrl} type="video/mp4" />
                </video>
              </>
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '600px' }}>
                <Image alt="カバー画像" src={`${faceImageBaseUrl}/${selectedParticipant}/face.jpg`} fill style={{ objectFit: 'contain', objectPosition: 'center' }} />
              </div>
            )}
          </div>
        </div>

        <div className={styles["control-area"]}>
          <div className={styles["button-area"]}>
            <button className={`${styles["button"]} ${styles["stt-start-button"]}`} ref={startButton} onClick={() => SpeechRecognition.startListening({ continuous: true, language: 'ja-JP' })}>
              Start
            </button>
            <button className={`${styles["button"]} ${styles["stt-stop-button"]}`} onClick={SpeechRecognition.stopListening}>
              Stop
            </button>
            <button className={styles["button"]} onClick={chat}>
              Chat
            </button>
            <p className={styles["mic-status"]}>
              （ステータス: {listening ? '認識中' : '待機中'}）
            </p>
          </div>
          <textarea
            id="result_text"
            cols="200"
            rows="8"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
          <div>
            <select name="participants" id="participants" onChange={handleSelectChange}>
              {participantData.participants.map(participant => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
            <select name="stage" id="stage" onChange={handleStageChange} value={selectedStage} style={{ marginLeft: '10px' }}>
              {STAGES.map(stage => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  // faceImageBaseUrl が存在しなければ空文字を設定
  const faceImageBaseUrl = process.env.FACE_IMAGE_BASE_URL ?? '';
  const teamName = process.env.TEAM_NAME ?? '';
  const filePath = path.join(process.cwd(), 'participants.json');
  const data = await fsPromises.readFile(filePath);
  const objectData = JSON.parse(data);

  // 各ペルソナ用に、public/persona/{participant.id}/system_prompt_template.txt と interview_transcript.txt を読み込む
  for (const participant of objectData.participants) {
    const personaDir = path.join(process.cwd(), 'public', 'persona', participant.id);
    const intTransPath = path.join(personaDir, 'interview_transcript.txt');
    const systemTemplatePath = path.join(personaDir, 'system_prompt_template.txt');

    try {
      const interviewTranscriptData = await fsPromises.readFile(intTransPath);
      participant.interview_transcript = interviewTranscriptData.toString();
    } catch (err) {
      console.error(`Failed to read interview transcript for ${participant.id}:`, err);
      participant.interview_transcript = "";
    }
    try {
      const systemTemplateData = await fsPromises.readFile(systemTemplatePath);
      participant.system_template = systemTemplateData.toString();
    } catch (err) {
      console.error(`Failed to read system template for ${participant.id}:`, err);
      participant.system_template = "";
    }
  }

  return {
    props: {
      faceImageBaseUrl,
      participantData: objectData,
      teamName,
    }
  };
}