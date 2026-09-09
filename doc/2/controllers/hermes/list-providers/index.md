---
type: page
code: true
title: listProviders
description: List registered providers, their capabilities and JSON Schemas
---

# listProviders

Lists every registered provider (built-in and custom) with its capabilities, the recipient types it accepts, the audiences it can address, and the three JSON Schemas describing its account parameters, message content and send parameters.

Clients can use these schemas to build forms dynamically and to know how to shape `addAccount` and `sendMessage` requests.

The list can be restricted by capability (`capability=file` keeps the providers able to carry a file) and by the audience of the recipients a provider can reach: `audience=human` keeps the providers able to notify a person (email, SMS...), `audience=technical` those able to push to a resource (webhook, broker...).

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers[?capability=<capability>[,<capability>]][&audience=<audience>[,<audience>]]
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "listProviders",
  "capability": ["html", "file"],   // optional, a string or an array of strings
  "audience": ["human"]             // optional, a string or an array of strings
}
```

### Kourou

```bash
kourou hermes:listProviders

# only providers able to carry a file
kourou hermes:listProviders -a capability=file

# only providers able to carry both HTML content and a file
kourou hermes:listProviders -a capability=html,file

# only providers able to reach a person
kourou hermes:listProviders -a audience=human
```

---

## Arguments

- `capability` (optional): a string or an array of strings (comma separated in HTTP query strings). Only providers having **every** requested capability are returned. Well-known values: `text`, `html`, `json`, `file` (see below); custom providers may declare others.
- `audience` (optional): a string or an array of strings (comma separated in HTTP query strings). Only providers accepting **at least one** recipient type whose `audiences` include one of these values are returned (see [`hermes:listRecipientTypes`](/official-plugins/hermes-messenger/2/controllers/hermes/list-recipient-types)). Combines with `capability`.

Note the different semantics: `audience` matches **any** of the requested values (a provider reaching people or resources), `capability` requires **all** of them (a provider able to carry everything the message needs).

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
      "capabilities": ["text", "html", "file"],
      "acceptedRecipientTypes": ["email"],
      "audiences": ["human"],
      "accountParamsSchema": {
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
      "messageContentSchema": {
        "type": "object",
        "properties": {
          "subject": { "type": "string", "title": "Subject" },
          "message": { "type": "string", "title": "Message", "$comment": "long-text" }
        },
        "required": ["subject", "message"]
      },
      "messageAdditionalParamsSchema": {
        "type": "object",
        "properties": {
          "from": { "type": "string" },
          "cc": { "type": "array", "title": "Cc", "items": { "type": "string", "format": "email" } },
          "bcc": { "type": "array", "title": "Bcc", "items": { "type": "string", "format": "email" } },
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
- `capabilities`: what the provider can carry in a message. Well-known values, exported as `PROVIDER_CAPABILITY_*` constants:
  - `text`: short plain text (SMS-like)
  - `html`: long or rich HTML content (email-like)
  - `json`: structured JSON payload (message brokers, webhooks...)
  - `file`: file attachments or file transfer (email attachments, FTP, S3...)

  Built-in email providers declare `["text", "html", "file"]`, SMS providers `["text"]`. Capabilities are declarative: what a message may contain is enforced by `messageContentSchema` and `messageAdditionalParamsSchema`.
- `acceptedRecipientTypes`: names of the recipient types this provider accepts, see [`hermes:listRecipientTypes`](/official-plugins/hermes-messenger/2/controllers/hermes/list-recipient-types)
- `audiences`: every audience the provider can address, i.e. the deduplicated union of the `audiences` of its accepted recipient types. Handy to filter providers client-side without a second request.
- `accountParamsSchema`: JSON Schema of `body.params` for `addAccount`
- `messageContentSchema`: JSON Schema of `body.content` for `sendMessage`
- `messageAdditionalParamsSchema`: JSON Schema of `body.params` for `sendMessage`. The built-in providers declare `additionalProperties: false`: an unknown param is rejected instead of being silently ignored

::: warning
`name` is the provider's display name and may differ from the key used in routes. The built-in Sendgrid and SMS Envoi providers are registered under the route keys `sendgrid` and `smsenvoi`, but their `name` is `"SendGrid"` and `"SMS Envoi"`. Always use the route key in the `provider` argument of `addAccount`, `sendMessage` and `removeAccount`; it is also the value of the `provider` field returned by `listAccounts`.
:::
