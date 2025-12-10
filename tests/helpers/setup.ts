export function defineReflectProperties() {
  Reflect.defineProperty(globalThis, "kuzzle", {
    get() {
      return {
        id: "toto",
      };
    },
  });

  Reflect.defineProperty(globalThis, "app", {
    value: {},
    writable: true,
  });

  Reflect.defineProperty(globalThis.app, "sdk", {
    value: {
      query: {},
    },
  });

  Reflect.defineProperty(globalThis.app, "config", {
    value: {
      content: {
        controllers: {
          definition: {
            allowAdditionalActionProperties: false,
          },
        },
      },
    },
    writable: true,
  });
}
