import { RecipientTypeDefinition } from "./RecipientType";

export const phoneRecipient: RecipientTypeDefinition = {
  name: "phoneNumber",
  description: "A phone number, in E.164 format",

  jsonSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        title: "Phone Number",
        minLength: 1,
        pattern: String.raw`^\+[1-9]\d{1,14}$`,
      },
    },
    required: ["to"],
  },
};
