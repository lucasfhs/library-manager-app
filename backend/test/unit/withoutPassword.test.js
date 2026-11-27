const withoutPassword = require("../../src/utils/withoutPassword");

test("removes senha from a record", () => {
  expect(withoutPassword({ cpf: "1", senha: "x" })).toEqual({ cpf: "1" });
});

test("removes senha from every record of a list", () => {
  expect(withoutPassword([{ a: 1, senha: "x" }, { b: 2 }])).toEqual([{ a: 1 }, { b: 2 }]);
});

test("leaves non-objects untouched", () => {
  expect(withoutPassword(null)).toBeNull();
  expect(withoutPassword(true)).toBe(true);
});
