import bodyParser from "body-parser";
import express from "express";
import KafkaConfig from "./kafka-config";
import { sendMessageToKafka } from "./controller";

const app = express();
const jsonParser = bodyParser.json();

app.post("/api/send", jsonParser, sendMessageToKafka);


const kafkaConfig = new KafkaConfig();
kafkaConfig.consume("dev-topic", (message) => {
  console.log("Received message: 😇", message);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});