---
type: page
code: true
title: listRecipientTypes
description: List registered recipient types and their JSON Schemas
---

# listRecipientTypes

Lists every recipient type known to the plugin, built-in and custom.

A recipient type is a named JSON Schema describing the shape of **one** entry of the `recipients` array passed to `sendMessage`. Providers declare which recipient types they accept (see `acceptedRecipientTypes` in [`hermes:listProviders`](/official-plugins/hermes-messenger/2/controllers/hermes/list-providers)), so several providers can share the same recipient format.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/recipient-types
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "listRecipientTypes"
}
```

### Kourou

```bash
kourou hermes:listRecipientTypes
```

---

## Response

Returns an array of recipient type definitions. With the default plugin configuration, the two built-in types are returned:

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "listRecipientTypes",
  "result": [
    {
      "name": "email",
      "description": "An email address",
      "jsonSchema": {
        "type": "object",
        "properties": {
          "to": {
            "type": "string",
            "title": "Email",
            "pattern": "^[\\w._%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$"
          }
        },
        "required": ["to"]
      }
    },
    {
      "name": "phoneNumber",
      "description": "A phone number, in E.164 format",
      "jsonSchema": {
        "type": "object",
        "properties": {
          "to": {
            "type": "string",
            "title": "Phone Number",
            "minLength": 1,
            "pattern": "^\\+[1-9]\\d{1,14}$"
          }
        },
        "required": ["to"]
      }
    }
  ]
}
```

Each entry contains:

- `name`: unique key, referenced by providers in `acceptedRecipientTypes`
- `description`: human readable description
- `jsonSchema`: JSON Schema of one recipient entry

Custom recipient types can be added with `plugin.registerRecipientType()`, see the [Custom Provider guide](/official-plugins/hermes-messenger/2/guides/custom-provider#registering-a-custom-recipient-type).
