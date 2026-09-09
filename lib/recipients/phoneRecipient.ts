import {
  RECIPIENT_AUDIENCE_HUMAN,
  RecipientTypeDefinition,
} from "./RecipientType";

export const phoneRecipient: RecipientTypeDefinition = {
  name: "phoneNumber",
  description: "A phone number, in E.164 format",
  audiences: [RECIPIENT_AUDIENCE_HUMAN],
  jsonSchema: {
    type: "string",
    title: "Phone Number",
    pattern: String.raw`^\+[1-9]\d{1,14}$`,
  },
};
