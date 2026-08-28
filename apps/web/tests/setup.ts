import { getDictionary } from "../src/lib/i18n/dictionaries";

Object.assign(globalThis, {
  __PRIMORIA_TEST_I18N__: {
    language: "zh",
    dictionary: getDictionary("zh"),
    setLanguage: () => {},
    saving: false,
  },
});
