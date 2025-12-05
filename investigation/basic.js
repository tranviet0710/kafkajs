// 1_basic.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'my-app', brokers: ['localhost:9092'] });
const admin = kafka.admin();
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'test-group-1' });

const run = async () => {
  // A. Admin: Create 1 Topic with 1 Partition
  await admin.connect();
  await admin.createTopics({
    topics: [{ topic: 'topic-basic', numPartitions: 1 }]
  });
  console.log("Created topic: topic-basic (1 Partition)");
  await admin.disconnect();

  // B. Producer: Send message
  await producer.connect();
  await producer.send({
    topic: 'topic-basic',
    messages: [{ value: 'Hello Kafka World' }],
  });
  console.log("Sent message");

  // C. Consumer: Read message
  await consumer.connect();
  await consumer.subscribe({ topic: 'topic-basic', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        text: message.value.toString(),
        partition,
        topic
      });
    },
  });
};

run().catch(console.error);