const { Kafka } = require('kafkajs');
const kafka = new Kafka({ clientId: 'my-app', brokers: ['localhost:9092'] });

const run = async () => {
  const producer = kafka.producer();
  await producer.connect();
  // Gửi tin nhắn mới mỗi lần chạy để test
  await producer.send({ 
      topic: 'offset-demo', 
      messages: [{ value: 'Msg A' }, { value: 'Msg B' }] 
  });
  console.log("--- Producer: Sent Msg A & Msg B ---");
  await producer.disconnect();

  // ====================================================
  // CASE 7: RAW CONSUMER (Giả lập "Không Offset")
  // ====================================================
  // Mẹo: Dùng groupId ngẫu nhiên mỗi lần chạy -> Kafka coi là user mới tinh -> Luôn đọc từ đầu
  const rawConsumer = kafka.consumer({ groupId: `raw-group-${Date.now()}` });
  
  await rawConsumer.connect();
  // fromBeginning: true giúp ta luôn đọc được dữ liệu cũ
  await rawConsumer.subscribe({ topic: 'offset-demo', fromBeginning: true });

  console.log("\n--- Raw Consumer (Luôn đọc hết từ đầu - Offset 0) ---");
  // Ta dùng run nhưng chỉ chạy 1 lúc rồi stop để code chạy tiếp xuống dưới (chỉ để demo)
  // Trong thực tế consumer sẽ chạy mãi.
  let rawCount = 0;
  await rawConsumer.run({
    eachMessage: async ({ message, partition }) => {
      console.log(`[Raw] Offset: ${message.offset} | Value: ${message.value.toString()}`);
      rawCount++;
    },
  });

  // Hack nhỏ: Chờ 2 giây cho Raw Consumer đọc xong rồi tắt để chuyển sang demo Smart
  await new Promise(resolve => setTimeout(resolve, 2000));
  await rawConsumer.disconnect();


  // ====================================================
  // CASE 8: SMART CONSUMER (Có Offset - Có trí nhớ)
  // ====================================================
  const smartConsumer = kafka.consumer({ 
      groupId: 'group-smart-persistent', // Tên cố định để Kafka nhớ mặt
      enableAutoCommit: false // Tắt auto để ta tự commit bằng tay
  });
  
  await smartConsumer.connect();
  await smartConsumer.subscribe({ topic: 'offset-demo', fromBeginning: true });

  console.log("\n--- Smart Consumer (Chỉ đọc tin MỚI chưa xử lý) ---");
  await smartConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`[Smart] Offset: ${message.offset} | Value: ${message.value.toString()}`);
      
      // QUAN TRỌNG: Đánh dấu đã đọc xong
      await smartConsumer.commitOffsets([
        { topic, partition, offset: (Number(message.offset) + 1).toString() }
      ]);
    },
  });
};

run().catch(console.error);