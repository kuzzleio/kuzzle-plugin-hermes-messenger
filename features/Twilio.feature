Feature: Twilio Client

  Scenario: Register an account and send an email
    Given I execute the action "hermes/twilio":"removeAccount" with args:
      | account | "ilayda" |
    Given I successfully execute the action "hermes/twilio":"addAccount" with args:
      | account         | "ilayda"     |
      | body.accountSid | "accountSid" |
      | body.authToken  | "authToken"  |
      | body.defaultSender  | "+9053365366473" |
    When I successfully execute the action "hermes/twilio":"sendSms" with args:
      | account   | "ilayda"        |
      | body.to   | "+33629951621"  |
      | body.text | "Merhaba"       |
    Then I successfully execute the action "tests":"verifySendTwilio" with args:
      | account   | "ilayda"        |
      | body.from | "+9053365366473" |
      | body.to   | "+33629951621"  |
      | body.text | "Merhaba"       |
    When I successfully execute the action "hermes/twilio":"sendSms" with args:
      | account   | "common"        |
      | body.from | "+905312693835" |
      | body.to   | "+33629951621"  |
      | body.text | "Alo"           |
    Then I successfully execute the action "tests":"verifySendTwilio" with args:
      | account   | "common"        |
      | body.from | "+905312693835" |
      | body.to   | "+33629951621"  |
      | body.text | "Alo"           |

  Scenario: List accounts
    Given I execute the action "hermes/twilio":"removeAccount" with args:
      | account | "ilayda" |
    And I execute the action "hermes/twilio":"removeAccount" with args:
      | account | "water-fairy" |
    Given I successfully execute the action "hermes/twilio":"addAccount" with args:
      | account         | "ilayda"     |
      | body.accountSid | "accountSid" |
      | body.authToken  | "authToken" |
      | body.defaultSender  | "+9053365366473" |
    Given I successfully execute the action "hermes/twilio":"addAccount" with args:
      | account         | "water-fairy" |
      | body.accountSid | "accountSid"  |
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

