---
code: false
type: page
title: Overview
description: Overview of the Hermes Messenger plugin features and main concepts
order: 100
---

# Hermes Messenger

This plugin allows to send various types of messages (SMS, email) using external providers.

Available providers SMS providers:
  - Twilio

Available email providers:
  - Sendgrid

## Accounts Management

It's possible to register differents accounts for each providers.  

In this way, several accounts with differents credentials can be used to send messages.

The following API actions can be used to manipulate accounts for each providers:
  - `hermes/*:addAccount` (e.g. [hermes/twilio:addAccount](/official-plugins/hermes-messenger/1/controllers/twilio/add-account))
  - `hermes/*:removeAccount` (e.g [hermes/twilio:removeAccount](/official-plugins/hermes-messenger/1/controllers/twilio/remove-account))
  - `hermes/*:listAccounts` (e.g [hermes/twilio:listAccounts](/official-plugins/hermes-messenger/1/controllers/twilio/list-accounts))
