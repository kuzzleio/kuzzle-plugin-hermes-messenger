---
type: page
code: true
title: listAccounts
description: List Twilio accounts
---

# listAccounts

Lists Twilio accounts.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/twilio/accounts
Method: GET
```

### Other protocols

```js
{
  "controller": "hermes/twilio",
  "action": "listAccounts"
}
```

### Kourou

```bash
kourou hermes/twilio:listAccounts
```
---

## Response

Returns the names of registered accounts.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes/twilio",
  "action": "listAccounts",
  "result":  {
  "accounts": [
    {
      "name": "common",
      "options": {
        "defaultSender": "+33629951621"
      }
    },
    {
      "name": "ilayda",
      "options": {
        "defaultSender": "+33629951621"
      }
    },
    {
      "name": "aschen",
      "options": {
        "defaultSender": "+33629951621"
      }
    }
  ]
}

}
```