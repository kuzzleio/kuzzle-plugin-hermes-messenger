import { Kuzzle } from "kuzzle-sdk";

export async function truncateCollection(
  sdk: Kuzzle,
  index: string,
  collection: string,
) {
  await sdk.collection.refresh(index, collection);
  await sdk.document.deleteByQuery(index, collection, {});
}

export async function beforeEachTruncateCollections(sdk: Kuzzle) {
  await Promise.all([truncateCollection(sdk, "hermes-messenger", "messages")]);
}
