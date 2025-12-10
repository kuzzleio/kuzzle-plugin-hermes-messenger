import { defineReflectProperties } from "tests/helpers";
import { TestProvider } from "tests/mocks";
import { describe, it, expect, vi } from "vitest";

beforeAll(() => {
  defineReflectProperties();
});

describe("TestProvider", () => {
  const testProvider = new TestProvider();
  it("Register an account", async () => {
    const addAccountSpy = vi.spyOn(testProvider, "addAccount");
    const nodeAddAccountSpy = vi.spyOn(testProvider, "nodeAddAccount");
    const createAccountSpy = vi.spyOn(testProvider, "_createAccount");

    testProvider.addAccount("myaccount", { option: "myoptions" });

    expect(addAccountSpy).toHaveBeenCalledWith("myaccount", {
      option: "myoptions",
    });
    expect(nodeAddAccountSpy).toHaveBeenCalledWith("myaccount", {
      option: "myoptions",
    });
    expect(createAccountSpy).toHaveBeenCalledWith("myaccount", {
      option: "myoptions",
    });

    addAccountSpy.mockRestore();
    nodeAddAccountSpy.mockRestore();
  });

  it("Remove an account", async () => {
    const removeAccountSpy = vi.spyOn(testProvider, "removeAccount");
    const nodeRemoveAccountSpy = vi.spyOn(testProvider, "nodeRemoveAccount");

    testProvider.removeAccount("myaccount");

    expect(removeAccountSpy).toHaveBeenCalledWith("myaccount");
    expect(nodeRemoveAccountSpy).toHaveBeenCalledWith("myaccount");

    removeAccountSpy.mockRestore();
    nodeRemoveAccountSpy.mockRestore();
  });

  it("Remove an account that does not exist", () => {
    const removeAccountSpy = vi.spyOn(testProvider, "removeAccount");

    expect(() => testProvider.removeAccount("notFound")).toThrowError(
      'TestProvider account "notFound" does not exists.',
    );

    expect(removeAccountSpy).toHaveBeenCalledWith("notFound");

    removeAccountSpy.mockRestore();
  });

  it("Get an account", async () => {
    const getAccountSpy = vi.spyOn(testProvider, "getAccount");

    testProvider.addAccount("myaccount", { option: "myoptions" });
    const account = testProvider.getAccount("myaccount");

    expect(getAccountSpy).toHaveBeenCalledWith("myaccount");
    expect(account.name).toBe("myaccount");

    getAccountSpy.mockRestore();
  });

  it("Get an account that does not exist", () => {
    const getAccountSpy = vi.spyOn(testProvider, "getAccount");

    expect(() => testProvider.getAccount("notFound")).toThrowError(
      'Account "notFound" does not exists',
    );

    expect(getAccountSpy).toHaveBeenCalledWith("notFound");

    getAccountSpy.mockRestore();
  });

  it("List accounts", async () => {
    const listAccountsSpy = vi.spyOn(testProvider, "listAccounts");

    testProvider.listAccounts();

    expect(listAccountsSpy).toHaveBeenCalledWith();

    listAccountsSpy.mockRestore();
  });

  it("Validate params", async () => {
    const validateParamsSpy = vi.spyOn(testProvider, "validateParams");

    testProvider.validateParams({ type: "object" });

    expect(validateParamsSpy).toHaveBeenCalledWith({ type: "object" });

    validateParamsSpy.mockRestore();
  });

  it("Validate recipients", async () => {
    const validateRecipientsSpy = vi.spyOn(testProvider, "validateRecipients");

    testProvider.validateRecipients({ type: "object" });

    expect(validateRecipientsSpy).toHaveBeenCalledWith({ type: "object" });

    validateRecipientsSpy.mockRestore();
  });

  it("Validate content", async () => {
    const validateContentSpy = vi.spyOn(testProvider, "validateContent");

    testProvider.validateContent({ type: "object" });

    expect(validateContentSpy).toHaveBeenCalledWith({ type: "object" });

    validateContentSpy.mockRestore();
  });

  it("Get name", async () => {
    const getNameSpy = vi.spyOn(testProvider, "getName");

    testProvider.getName();

    expect(getNameSpy).toHaveBeenCalledWith();

    getNameSpy.mockRestore();
  });

  it("Get params json", async () => {
    const getNameSpy = vi.spyOn(testProvider, "getParamsJsonSchema");

    testProvider.getParamsJsonSchema();

    expect(getNameSpy).toHaveBeenCalledWith();

    getNameSpy.mockRestore();
  });

  it("Send a message", async () => {
    const sendSpy = vi.spyOn(testProvider, "send");

    const accountName = "myaccount";
    const recipients = ["recipient1"];
    const content = { text: "mycontent" };

    await testProvider.send(accountName, recipients, content);

    expect(sendSpy).toHaveBeenCalledWith(accountName, recipients, content);

    sendSpy.mockRestore();
  });
});
