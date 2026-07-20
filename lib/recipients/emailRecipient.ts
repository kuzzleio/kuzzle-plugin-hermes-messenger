import { RecipientTypeDefinition } from "./RecipientType";

export const emailRecipient: RecipientTypeDefinition = {
  name: "email",
  type: "email",
  description: "An email address",
  jsonSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        title: "Email",
        pattern: String.raw`^[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}$`,
      },
    },
    required: ["to"],
  },
};
