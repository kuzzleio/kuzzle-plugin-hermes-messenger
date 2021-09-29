Feature: Twilio Client

  Scenario: Register an account and send an email
    Given an existing collection "hermes-messenger":"config"
    Given I "update" the document "plugin--hermes-messenger" with content:
      | hermes-messenger.mockedAccounts.twilio | ["common", "ilayda", "water-fairy"] |
    Given I execute the action "hermes/twilio":"removeAccount" with args:
      | account | "ilayda" |
    Given I successfully execute the action "hermes/twilio":"addAccount" with args:
      | account         | "ilayda"     |
      | body.accountSid | "AC-accountSid" |
      | body.authToken  | "authToken"  |
      | body.defaultSender  | "+9053365366473" |
    When I successfully execute the action "hermes/twilio":"sendSms" with args:
      | account   | "ilayda"        |
      | body.to   | "+33629951621"  |
      | body.text | "Merhaba-1"     |
    Then The document "hermes-messenger":"messages":"Merhaba-1" content match:
      | account   | "ilayda"        |
      | from | "+9053365366473" |
      | to   | "+33629951621"  |
      | body | "Merhaba-1"       |
    When I successfully execute the action "hermes/twilio":"sendSms" with args:
      | account   | "common"        |
      | body.from | "+905312693835" |
      | body.to   | "+33629951621"  |
      | body.text | "Alo"           |
    Then The document "hermes-messenger":"messages":"Alo" content match:
      | account   | "common"        |
      | from | "+905312693835" |
      | to   | "+33629951621"  |
      | body | "Alo"           |

  @cluster
  Scenario: List accounts
    Given I target "node1"
    Given I execute the action "hermes/twilio":"removeAccount" with args:
      | account | "ilayda" |
    And I execute the action "hermes/twilio":"removeAccount" with args:
      | account | "water-fairy" |
    Given I successfully execute the action "hermes/twilio":"addAccount" with args:
      | account         | "ilayda"     |
      | body.accountSid | "AC-accountSid" |
      | body.authToken  | "authToken" |
      | body.defaultSender  | "+9053365366473" |
    Given I successfully execute the action "hermes/twilio":"addAccount" with args:
      | account         | "water-fairy" |
      | body.accountSid | "AC-accountSid"  |
      | body.authToken  | "authToken"  |
      | body.defaultSender  | "+9053365366472" |
    When I successfully execute the action "hermes/twilio":"listAccounts"
    Then I should receive a "accounts" array of objects matching:
      | name | options |
      | "common" | { defaultSender: "+33629951621" } |
      | "ilayda" | { defaultSender: "+9053365366473" } |
      | "water-fairy" | { defaultSender: "+9053365366472" } |
    When I execute the action "hermes/twilio":"removeAccount" with args:
      | account | "water-fairy" |
    And I successfully execute the action "hermes/twilio":"listAccounts"
    Then I should receive a "accounts" array of objects matching:
      | name | options |
      | "common" | { defaultSender: "+33629951621" } |
      | "ilayda" | { defaultSender: "+9053365366473" } |
    Given I target "node2"
    And I successfully execute the action "hermes/twilio":"listAccounts"
    Then I should receive a "accounts" array of objects matching:
      | name | options |
      | "common" | { defaultSender: "+33629951621" } |
      | "ilayda" | { defaultSender: "+9053365366473" } |
    Given I target "node3"
    And I successfully execute the action "hermes/twilio":"listAccounts"
    Then I should receive a "accounts" array of objects matching:
      | name | options |
      | "common" | { defaultSender: "+33629951621" } |
      | "ilayda" | { defaultSender: "+9053365366473" } |
