---
type: page
code: true
title: addAccount
description: Add a Sendgrid account
---

# addAccount

Adds a Sendgrid account. This account can then be used to send emails.

The `params` object must match the provider's account JSON Schema (`accountParamsSchema`), exposed by [`hermes:listProviders`](/official-plugins/hermes-messenger/2/controllers/hermes/list-providers).

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/sendgrid/accounts/:accountId
Method: PUT
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "addAccount",
  "providerId": "sendgrid",
  "accountId": "<account id>",
  "body": {
    "displayName": "<label>",   // optional
    "params": {
      "api_key": "<sendgrid api key>",
      "default_sender": "<default sender email>"
    }
  }
}
```

### Kourou

```bash
kourou hermes:addAccount -a providerId=sendgrid -a accountId=<account id> --body '{
  "params": {
    "api_key": "<sendgrid api key>",
    "default_sender": "<default sender email>"
  }
}'
```

---

## Arguments

- `providerId`: provider identifier, `sendgrid`
- `accountId`: identifier to register the account under, unique within the provider

## Body properties

- `displayName` (optional): label for user interfaces; defaults to `accountId`
- `params.api_key`: Sendgrid API key
- `params.default_sender`: email address used as sender when `params.from` is not provided on `sendMessage`

---

## Response

Returns an empty result on success.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "addAccount",
  "result": null
}
```
