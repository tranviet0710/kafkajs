export const WebSocketEvents = {
  SetupWallet: "setup_wallet",
  ReadBalance: "read_balance",

  // From server to client
  BalanceUpdated: "balance_updated",
  PriceUpdated: "price_updated",
};

export const KafkaTopics = {
  TaskToReadBalance: "task_to_read_balance",
  WalletBalance: "wallet_balance",
  CurrencyPrice: "currency_price",
};
