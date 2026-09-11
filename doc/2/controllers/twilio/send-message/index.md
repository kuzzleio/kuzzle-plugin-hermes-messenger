---
type: page
code: true
title: sendMessage
description: Send a message (SMS) with a Twilio account
---

# sendMessage

Sends an SMS to each recipient using one of the registered Twilio accounts.

The Twilio provider accepts the `phoneNumber` recipient type: each entry of `recipients` is an object with a `to` phone number in E.164 format.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/twilio/accounts/:accountId
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "sendMessage",
  "providerId": "twilio",
  "accountId": "<account id>",
  "body": {
    "recipients": ["<recipient phone number>"],
    "content": {
      "body": "<sms content>"
    },
    "params": {
      "from": "<twilio phone number>" // optional — overrides account default_sender
    }
  }
}
```

### Kourou

```bash
kourou hermes:sendMessage -a providerId=twilio -a accountId=<account id> --body '{
  "recipients": ["<recipient phone number>"],
  "content": {
    "body": "<sms content>"
  },
  "params": {}
}'
```

---

## Arguments

- `providerId`: provider identifier, `twilio`
- `accountId`: identifier of a registered Twilio account

## Body properties

- `recipients`: array of E.164 phone number strings (recipient type `phoneNumber`)
- `content.body`: SMS text
- `params.from`: sender override (optional)

`params` is validated against the provider's `messageAdditionalParamsSchema`.

---

## Response

Returns an empty result on success.

```js
{
  "requestId": "d16d5e8c-464a-4589-938f-fd84f46080b9",
  "status": 200,
  "error": null,
  "controller": "hermes",
  "action": "sendMessage",
  "result": null
}
```
