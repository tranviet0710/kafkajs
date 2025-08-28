import KafkaConfig from "./kafka-config";
import uuid from 'uuid';

const sendMessageToKafka = async (req, res) => {
    try {
        const kafkaConfig = new KafkaConfig();
        const { message } = req.body;
        const messages = [{ key: uuid(), value: message }];
        await kafkaConfig.produce("dev-topic", messages);
        res.status(200).send(message);
    } catch (error) {
        console.error("Error sending message to Kafka:", error);
        res.status(500).send("Error sending message to Kafka");
    }
};

const controllers = { sendMessageToKafka };
export default controllers;