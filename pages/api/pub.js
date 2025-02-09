// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
const { PubSub } = require('@google-cloud/pubsub');
const orderingKey = 'key1'
const topicNameOrId = 'projects/prj-digitalhuman/topics/dh-topic';
const pubSubClient = new PubSub();

export default function handler(req, res) {
  // postじゃないならエラー
  if (req.method !== 'POST') {
    res.status(405).end(); //Method Not Allowed
    return;
  }

  // 送られてきたデータを取得
  const sentences = req.body.sentences;
  console.log(sentences);

  // 送られてきた文章を一文ずつPublish
  sentences.forEach(async (sentence) => {
    await publishMessage(topicNameOrId, JSON.stringify(sentence));
  });
  res.status(200).json({ name: 'John Doe' })
}

async function publishMessage(topicNameOrId, data) {
  // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
  const dataBuffer = Buffer.from(data);

  try {
    const messageId = await pubSubClient
      .topic(topicNameOrId)
      .publishMessage({
        data: dataBuffer,
        // orderingKey: orderingKey,
      });
    console.log(`Message ${messageId} published.`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}