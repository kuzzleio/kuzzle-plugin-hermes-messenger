---
type: page
code: true
title: sendMessage
description: Send a message (SMS) with a SMS Envoi account
---

# sendMessage

Sends an SMS to every recipient using one of the registered SMS Envoi accounts. All recipients are sent in a single API call to SMS Envoi.

The SMS Envoi provider accepts the `phoneNumber` recipient type: each entry of `recipients` is an object with a `to` phone number in E.164 format.

---

## Query Syntax

### HTTP

```http
URL: http://kuzzle:7512/_/hermes/providers/smsenvoi/accounts/:account
Method: POST
```

### Other protocols

```js
{
  "controller": "hermes",
  "action": "sendMessage",
  "provider": "smsenvoi",
  "account": "<account name>",
  "body": {
    "recipients": [{ "to": "+33600000000" }],
    "content": {
      "message": "<sms content>"
    },
    "params": {
      "from": "<sender>" // optional — overrides account default_sender
    }
  }
}
```

### Kourou

```bash
kourou hermes:sendMessage -a provider=smsenvoi -a account=<account name> --body '{
  "recipients": [{ "to": "+33600000000" }],
  "content": {
    "message": "<sms content>"
  },
  "params": {}
}'
```

---

## Arguments

- `provider`: provider key, `smsenvoi`
- `account`: name of a registered SMS Envoi account

## Body properties

- `recipients`: array of `{ "to": "<E.164 phone number>" }` objects (recipient type `phoneNumber`)
- `content.message`: SMS text
- `params.from`: sender override (optional)

`params` is validated against the provider's `sendParamsJsonSchema`.

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
