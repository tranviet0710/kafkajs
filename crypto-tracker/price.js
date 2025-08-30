import { Kafka, logLevel } from "kafkajs";
import { KafkaTopics } from "./events.js";
import WebSocket from "ws";

const BTC_USDT_TICKER = "btcusdt";
const ETH_USDT_TICKER = "ethusdt";
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";

const kafka = new Kafka({ brokers: [KAFKA_BROKER], logLevel: logLevel.ERROR });
const producer = kafka.producer();

async function main() {
  await producer.connect();

  const callbacks = {
    message: async (jsonString) => {
      const { stream, data } = JSON.parse(jsonString);
      const currency = stream.split("usdt@ticker")[0];
      const price = Number(data.c);

      const payload = JSON.stringify({ price });
      await producer.send({
        topic: KafkaTopics.CurrencyPrice,
        messages: [{ key: currency, value: payload }],
      });
    },
  };

  // Build Binance combined stream URL
  const streams = [`${BTC_USDT_TICKER}@ticker`, `${ETH_USDT_TICKER}@ticker`];
  const url = `wss://stream.binance.com:9443/stream?streams=${streams.join(
    "/"
  )}`;

  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("Binance WS connected to:", url);
  });

  ws.on("message", async (data) => {
    try {
      // data is a Buffer or string
      const text = data.toString();
      await callbacks.message(text);
    } catch (err) {
      console.error("Error handling WS message:", err);
    }
  });

  ws.on("error", (err) => {
    console.error("Binance WS error:", err);
  });

  process.on("SIGTERM", async () => {
    try {
      ws.close();
    } catch (e) {}
    await producer.disconnect();
    process.exit(0);
  });

  console.log("Started successfully");
}

main();
