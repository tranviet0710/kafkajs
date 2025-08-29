import bodyParser from "body-parser";
import express from "express";
import KafkaConfig from "./kafka-config.js";
import controllers from "./controller.js";
import { faker } from "@faker-js/faker";

const app = express();
const jsonParser = bodyParser.json();

app.post("/api/send", jsonParser, controllers.sendMessageToKafka);

const kafkaConfig = new KafkaConfig();

kafkaConfig.consume("dev-topic", (message) => {
  console.log("Received message: 😇", message);
});

kafkaConfig.consume("viet-topic", (message) => {
  console.log({
    offset: message.offset,
    value: message.value?.toString(),
    key: message.key?.toString(),
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

/**
 * MESSAGES LOOP
 */

while (true) {
  await new Promise(async (res) => {
    await kafkaConfig.produce("viet-topic", [
      {
        key: faker.internet.username(),
        value: faker.internet.emoji(),
      },
    ]);
    setTimeout(() => res(null), 3 * Math.random() * 1000);
  });
}
