import { Kuzzle, WebSocket } from "kuzzle-sdk";

export function useSdk(port = 7512): Kuzzle {
  return new Kuzzle(new WebSocket("localhost", { port }));
}
