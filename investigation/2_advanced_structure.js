const { Kafka } = require("kafkajs");

const kafka = new Kafka({ clientId: "my-advanced-app", brokers: ["localhost:9092"] });
const admin = kafka.admin();
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "advanced-group-1" });

const run = async () => {
    // A. Admin: Create 2 Topics with different Partition counts
    await admin.connect();
    await admin.createTopics({
        topics: [
            { topic: "orders", numPartitions: 2 },
            { topic: "notifications", numPartitions: 2 }
        ]
    });
    await admin.disconnect();

    // B. Producer: Send messages to both topics
    await producer.connect();
    await producer.send({
        topic: "orders",
        messages: [
            { key: "order1", value: "Order 1 details" },
            { key: "order2", value: "Order 2 details" }
        ],
    });
    await producer.send({
        topic: "notifications",
        messages: [
            { key: "notif1", value: "Notification 1 details" },
            { key: "notif2", value: "Notification 2 details" },
        ],
    });

    // C. Consumer: Read messages from both topics
    await consumer.connect();
    await consumer.subscribe({ topics: ["orders", "notifications"], fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            console.log(`Received from ${topic} (Partition ${partition}): ${message.value.toString()}`);
        },
    });
};

run().catch(console.error);