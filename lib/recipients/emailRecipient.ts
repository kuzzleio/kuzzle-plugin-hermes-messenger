import {
  RECIPIENT_AUDIENCE_HUMAN,
  RecipientTypeDefinition,
} from "./RecipientType";

export const emailRecipient: RecipientTypeDefinition = {
  name: "email",
  description: "An email address",
  audiences: [RECIPIENT_AUDIENCE_HUMAN],
  jsonSchema: {
    type: "string",
    title: "Email",
    format: "email",
  },
};
