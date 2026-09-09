import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  emailRecipient,
  phoneRecipient,
  RECIPIENT_AUDIENCE_HUMAN,
  RECIPIENT_AUDIENCE_TECHNICAL,
  RecipientTypeDefinition,
  RecipientTypeRegistry,
  uriRecipient,
} from "lib/recipients";
import { describe, it, expect } from "vitest";

const pushToken: RecipientTypeDefinition = {
  name: "pushToken",
  description: "A device push token",
  audiences: [RECIPIENT_AUDIENCE_HUMAN, RECIPIENT_AUDIENCE_TECHNICAL],
  jsonSchema: { type: "string", minLength: 1 },
};

function buildRegistry(): RecipientTypeRegistry {
  const registry = new RecipientTypeRegistry();
  registry.register(emailRecipient);
  registry.register(phoneRecipient);
  registry.register(uriRecipient);
  registry.register(pushToken);

  return registry;
}

describe("RecipientTypeRegistry – audiences", () => {
  it("lists every recipient type without filter", () => {
    expect(
      buildRegistry()
        .list()
        .map((t) => t.name),
    ).toEqual(["email", "phoneNumber", "uri", "pushToken"]);
  });

  it("filters recipient types on one audience", () => {
    const registry = buildRegistry();

    expect(registry.list({ audience: "human" }).map((t) => t.name)).toEqual([
      "email",
      "phoneNumber",
      "pushToken",
    ]);
    expect(registry.list({ audience: "technical" }).map((t) => t.name)).toEqual(
      ["uri", "pushToken"],
    );
    expect(registry.list({ audience: "nobody" })).toEqual([]);
  });

  it("filters recipient types on several audiences at once", () => {
    const registry = buildRegistry();

    expect(
      registry.list({ audience: ["human", "technical"] }).map((t) => t.name),
    ).toEqual(["email", "phoneNumber", "uri", "pushToken"]);
    expect(
      registry.list({ audience: ["technical", "nobody"] }).map((t) => t.name),
    ).toEqual(["uri", "pushToken"]);
    expect(registry.list({ audience: ["nobody", "nothing"] })).toEqual([]);
  });

  it("an undefined audience or an empty array means no filter", () => {
    expect(buildRegistry().list({ audience: undefined })).toHaveLength(4);
    expect(buildRegistry().list({ audience: [] })).toHaveLength(4);
  });

  it("rejects a definition without a valid audiences array", () => {
    const registry = new RecipientTypeRegistry();

    for (const audiences of [undefined, null, "human", [], [""], [42]]) {
      expect(() =>
        registry.register({
          name: "broken",
          description: "Broken",
          audiences: audiences as any,
          jsonSchema: { type: "string" },
        }),
      ).toThrowError(
        'Recipient type "broken" must declare "audiences" as a non-empty array of non-empty strings.',
      );
    }

    expect(registry.has("broken")).toBe(false);
  });

  it("registering the same name with different audiences throws", () => {
    const registry = new RecipientTypeRegistry();
    registry.register(emailRecipient);

    expect(() =>
      registry.register({ ...emailRecipient, audiences: ["technical"] }),
    ).toThrowError(
      'Recipient type "email" is already registered with a different definition.',
    );
  });
});

describe("uri recipient type", () => {
  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile(uriRecipient.jsonSchema);

  it("targets the technical audience only", () => {
    expect(uriRecipient.audiences).toEqual(["technical"]);
  });

  it("accepts absolute URIs of any scheme", () => {
    for (const uri of [
      "https://example.com/hooks/alerts",
      "http://localhost:8080/",
      "kafka://broker.internal:9092/alerts",
      "mqtt://broker.internal/devices/+/alerts",
      "s3://my-bucket/exports/",
      "ftp://ftp.example.com/incoming",
      "mailto:ops@example.com",
    ]) {
      expect(validate(uri), uri).toBe(true);
    }
  });

  it("rejects strings that are not absolute URIs", () => {
    for (const value of [
      "not a uri",
      "topic/only",
      "/relative/path",
      "example.com/no-scheme",
      "",
    ]) {
      expect(validate(value), value).toBe(false);
    }
  });
});
