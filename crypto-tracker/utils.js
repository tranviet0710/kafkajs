import readline from "readline";
import { WebSocketEvents } from "./events.js";

export function setupKeyListener(handlers) {
  readline.emitKeypressEvents(process.stdin);

  process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_str, key) => {
    if (key.ctrl && key.name === "c") handlers.onClose();
    else if (key.name === "return") handlers.onEnter();
  });
}

export function sendSocketMessage(ws, type, data) {
  if (ws.readyState === ws.CLOSED) return;
  const message = JSON.stringify({ type, data: data || null });
  ws.send(message);
}

export function loadWalletBalanceLoop(ws, seconds) {
  setTimeout(() => {
    if (ws.readyState !== ws.CLOSED) {
      sendSocketMessage(ws, WebSocketEvents.ReadBalance);
      loadWalletBalanceLoop(ws, seconds);
    }
  }, seconds * 1000);
}

export function formatUSD(amount) {
  const format = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  return format.format(amount);
}

export function printBalance(currency, price, balance) {
  process.stdout.write(`Wallet:  ${currency.toUpperCase()}\n`);
  process.stdout.write(
    `Price:   ${price ? formatUSD(Number(price)) : "..."}\n`
  );
  process.stdout.write(`Balance: ${balance || "..."}\n`);
  process.stdout.write(
    `Value:   ${
      balance !== undefined && price ? formatUSD(balance * price) : "..."
    }\n`
  );

  process.stdout.moveCursor(0, -4);
}

export function getCurrencyFromAddress(address) {
  return address.startsWith("0x") ? "eth" : "btc";
}
