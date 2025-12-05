// 3_consumer_groups.js
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ clientId: 'my-app', brokers: ['localhost:9092'] });

const mode = process.argv[2]; // Pass 'group' or 'broadcast' as argument

const run = async () => {
  // If 'group', we use a static ID (Load Balancing). 
  // If 'broadcast', we generate a random ID (Independent Consumer / "No Group").
  const groupId = mode === 'group' ? 'my-shared-group-V2' : `temp-group-${Math.random()}`;
  
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders', fromBeginning: true });

  console.log(`Consumer started. Mode: ${mode}, GroupID: ${groupId}`);

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      console.log(`Processing Order: ${message.value.toString()} on Partition: ${partition}`);
    },
  });
    // Reset offsets to beginning for demonstration purposes
    consumer.seek({ topic: 'orders', partition: 0, offset: '0' }); 
    consumer.seek({ topic: 'orders', partition: 1, offset: '0' });
};

// USAGE:
// Terminal 1: node 3_consumer_groups.js group
// Terminal 2: node 3_consumer_groups.js group
// -> Result: They SPLIT the messages (Load Balancing).

// Terminal 3: node 3_consumer_groups.js broadcast
// -> Result: This one gets ALL messages (Simulates no group/PubSub).
run().catch(console.error);