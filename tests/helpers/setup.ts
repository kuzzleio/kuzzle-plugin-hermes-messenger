import { beforeEachTruncateCollections } from "../hooks/collections";
import { useSdk } from "./sdk";

export function setupHooks() {
  const node1 = useSdk(17510);
  const node2 = useSdk(17511);
  const node3 = useSdk(17512);

  beforeAll(async () => {
    await Promise.all([node1.connect(), node2.connect(), node3.connect()]);
  });

  beforeEach(async () => {
    await beforeEachTruncateCollections(node1);
  });

  afterAll(async () => {
    node1.disconnect();
    node2.disconnect();
    node3.disconnect();
  });

  return { node1, node2, node3 };
}
