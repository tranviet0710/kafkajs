import { Kafka } from "kafkajs";

class KafkaConfig {
  constructor() {
    this.kafka = new Kafka({
      clientId: "nodejs-kafka",
      brokers: ["localhost:9092"],
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: "dev-group" });
    this._consumerRunning = false;
    // Map topic -> array of callbacks
    this._topicCallbacks = new Map();
  }

  async produce(topic, messages) {
    try {
      await this.producer.connect();
      await this.producer.send({
        topic,
        messages,
      });
    } catch (error) {
      console.error("Error connecting to Kafka:", error);
    } finally {
      await this.producer.disconnect();
    }
  }

  async consume(topic, callback) {
    try {
      if (!this._consumerConnected) {
        await this.consumer.connect();
        this._consumerConnected = true;
      }

      if (!this._topicCallbacks.has(topic)) {
        this._topicCallbacks.set(topic, []);
      }
      this._topicCallbacks.get(topic).push(callback);

      // Subscribe to the topic (can be called while consumer is running)
      await this.consumer.subscribe({ topic, fromBeginning: true });

      // Start the consumer loop only once. The run() handler will dispatch
      // every incoming message to the callbacks registered for the
      // message's topic.
      if (!this._consumerRunning) {
        this._consumerRunning = true;
        await this.consumer.run({
          eachMessage: async ({ topic: msgTopic, partition, message }) => {
            const value = message.value ? message.value.toString() : null;
            const key = message.key ? message.key.toString() : null;
            const payload = {
              topic: msgTopic,
              partition,
              offset: message.offset,
              key,
              value,
            };
            const callbacks = this._topicCallbacks.get(msgTopic) || [];
            for (const cb of callbacks) {
              try {
                await cb(payload);
              } catch (err) {
                console.error("Error in consume callback for", msgTopic, err);
              }
            }
          },
        });
      }
    } catch (error) {
      console.error("Error connecting to Kafka:", error);
    }
  }
}

export default KafkaConfig;
