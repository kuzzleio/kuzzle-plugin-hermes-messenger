---
type: page
code: true
title: listProviders
description: List registered providers, their capabilities and JSON Schemas
---

# listProviders

Lists every registered provider (built-in and custom) with its capabilities, the recipient types it accepts, and the three JSON Schemas describing its account parameters, message content and send parameters.

Clients can use these schemas to build forms dynamically and to know how to shape `addAccount` and `sendMessage` requests.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "listProviders",
  "body": {
    "filters": {            // optional
      "fileAttachment": true
    }
  }
}
```

### Kourou

```bash
kourou hermes:listProviders

# only providers supporting attachments
kourou hermes:listProviders --body '{ "filters": { "fileAttachment": true } }'
```

---

## Body properties

- `filters` (optional): partial `capabilities` object. Only providers whose capabilities match every key are returned. Available keys: `fileAttachment`, `longMessage`, `shortMessage`, `json`.

---

## Response

Returns an array of serialized providers.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "listProviders",
  "result": [
    {
      "name": "smtp",
      "capabilities": {
        "longMessage": true,
        "shortMessage": true,
        "fileAttachment": true,
        "json": false
      },
      "acceptedRecipientTypes": ["email"],
      "paramsJsonSchema": {
        "type": "object",
        "properties": {
          "host_name": { "type": "string", "title": "Host Name", "minLength": 1 },
          "port": { "type": "integer", "title": "Port" },
          "user": { "type": "string", "title": "User", "minLength": 1 },
          "password": { "type": "string", "format": "password", "title": "Password", "minLength": 1 },
          "default_sender": { "type": "string", "format": "email", "title": "Default Sender", "minLength": 1 }
        },
        "required": ["host_name", "port", "user", "password", "default_sender"]
      },
      "contentJsonSchema": {
        "type": "object",
        "properties": {
          "subject": { "type": "string", "title": "Subject" },
          "message": { "type": "string", "title": "Message", "$comment": "long-text" }
        },
        "required": ["subject", "message"]
      },
      "sendParamsJsonSchema": {
        "type": "object",
        "properties": {
          "from": { "type": "string" },
          "cc": { "type": "string", "title": "Cc" },
          "bcc": { "type": "string", "title": "Bcc" },
          "attachments": { "type": "array", "items": { "type": "object" } }
        }
      }
    },
    // ... twilio, SendGrid, SMS Envoi
  ]
}
```

Each entry contains:

- `name`: display name of the provider
- `capabilities`: what the provider supports (`fileAttachment`, `longMessage`, `shortMessage`, `json`)
- `acceptedRecipientTypes`: names of the recipient types this provider accepts, see [`hermes:listRecipientTypes`](/official-plugins/hermes-messenger/2/controllers/hermes/list-recipient-types)
- `paramsJsonSchema`: JSON Schema of `body.params` for `addAccount`
- `contentJsonSchema`: JSON Schema of `body.content` for `sendMessage`
- `sendParamsJsonSchema`: JSON Schema of `body.params` for `sendMessage`

::: warning
`name` is the provider's display name and may differ from the key used in routes. The built-in Sendgrid and SMS Envoi providers are registered under the route keys `sendgrid` and `smsenvoi`, but their `name` is `"SendGrid"` and `"SMS Envoi"`. Always use the route key in the `provider` argument of `addAccount`, `sendMessage`, `listAccounts` and `removeAccount`.
:::
