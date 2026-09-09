---
type: page
code: true
title: listRecipientTypes
description: List registered recipient types and their JSON Schemas
---

# listRecipientTypes

Lists every recipient type known to the plugin, built-in and custom.

A recipient type is a named JSON Schema describing the format of **one** recipient string of the `recipients` array passed to `sendMessage`. Providers declare which recipient types they accept (see `acceptedRecipientTypes` in [`hermes:listProviders`](/official-plugins/hermes-messenger/2/controllers/hermes/list-providers)), so several providers can share the same recipient format.

Each recipient type also declares the **audiences** it is meant for: `human` when the recipient designates a person (an email address, a phone number), `technical` when it designates a resource (a webhook URI, a broker topic, a bucket). An application can thus offer only human oriented recipient types when editing a user's contacts, and only technical ones when configuring an integration.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/recipient-types[?audience=<audience>[,<audience>]]
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "listRecipientTypes",
  "audience": "human"     // optional, a string or an array of strings
}
```

### Kourou

```bash
kourou hermes:listRecipientTypes

# only recipient types a user can be reached through
kourou hermes:listRecipientTypes -a audience=human

# several audiences at once
kourou hermes:listRecipientTypes -a audience=human,technical
```

---

## Arguments

- `audience` (optional): a string or an array of strings. Only recipient types whose `audiences` include at least one of these values are returned. In HTTP query strings, several audiences are separated by commas (`?audience=human,technical`). The built-in `email` and `phoneNumber` types belong to `human`, `uri` to `technical`; custom types may declare any string. An unknown audience returns an empty array.

---

## Response

Returns an array of recipient type definitions. With the default plugin configuration, the three built-in types are returned:

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
      "audiences": ["human"],
      "jsonSchema": {
        "type": "string",
        "title": "Email",
        "format": "email"
      }
    },
    {
      "name": "phoneNumber",
      "description": "A phone number, in E.164 format",
      "audiences": ["human"],
      "jsonSchema": {
        "type": "string",
        "title": "Phone Number",
        "pattern": "^\\+[1-9]\\d{1,14}$"
      }
    },
    {
      "name": "uri",
      "description": "An absolute URI, such as a webhook URL or a broker topic",
      "audiences": ["technical"],
      "jsonSchema": {
        "type": "string",
        "title": "URI",
        "format": "uri"
      }
    }
  ]
}
```

Each entry contains:

- `name`: unique key, referenced by providers in `acceptedRecipientTypes`
- `description`: human readable description
- `audiences`: non-empty array of audiences the type is meant for (`human`, `technical`, or custom values). A type may belong to several audiences.
- `jsonSchema`: JSON Schema of one recipient string

The built-in `uri` type accepts any absolute URI (`https://`, `kafka://`, `mqtt://`, `s3://`, `ftp://`...); a provider accepting it is expected to check the schemes it supports.

Custom recipient types can be added with `plugin.registerRecipientType()`, see the [Custom Provider guide](/official-plugins/hermes-messenger/2/guides/custom-provider#registering-a-custom-recipient-type).
