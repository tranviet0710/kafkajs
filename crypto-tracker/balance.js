import axios from "axios";
import { Kafka, logLevel } from "kafkajs";
import { KafkaTopics } from "./events.js";

const BLOCKCYPHER_API_URL = "https://api.blockcypher.com/v1";
const BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";

const kafka = new Kafka({ brokers: [KAFKA_BROKER], logLevel: logLevel.ERROR });
const producer = kafka.producer();

/**
 * Same groupId for all instances of the balance service,
 * because we want to load balance the tasks.
 * (Message-Queue-Pattern)
 */
const groupId = "balance-crawler";
const taskConsumer = kafka.consumer({ groupId, retry: { retries: 0 } });

async function getWalletBalance(currency, address) {
  let url = `${BLOCKCYPHER_API_URL}/${currency}/main/addrs/${address}/balance`;
  if (BLOCKCYPHER_TOKEN) url += `?token=${BLOCKCYPHER_TOKEN}`;

  const { data } = await axios.get(url);

  if (currency === "btc") return data.balance / 100000000;
  else return data.balance / 1000000000000000000;
}

async function main() {
  await producer.connect();
  await taskConsumer.connect();

  await taskConsumer.subscribe({
    topic: KafkaTopics.TaskToReadBalance,
    fromBeginning: true,
  });

  console.log("Started balance successfully");

  await taskConsumer.run({
    eachMessage: async ({ message }) => {
      const { address, currency } = JSON.parse(message.value.toString());
      const balance = await getWalletBalance(currency, address);

      const payload = JSON.stringify({ balance });
      await producer.send({
        topic: KafkaTopics.WalletBalance,
        messages: [{ key: address, value: payload }],
      });
    },
  });
}

main();
