import { describe, expect, it } from "vitest";
import { displayName, looksLikeEmail } from "./username";

describe("displayName", () => {
  it("usa il nome scelto quando c'è", () => {
    expect(displayName("Salvo", "salvo.bilotti@gmail.com")).toBe("Salvo");
    expect(displayName("  Salvo ", "altro")).toBe("Salvo");
  });
  it("non mostra mai un indirizzo e-mail", () => {
    expect(displayName("", "salvo.bilotti@gmail.com")).toBe("");
    expect(displayName(undefined, "nome@dominio.it")).toBe("");
  });
  it("ripiega sul nome account se è un nome vero", () => {
    expect(displayName("", "Marco")).toBe("Marco");
  });
  it("l'ospite resta senza nome", () => {
    expect(displayName("", "Ospite")).toBe("");
    expect(displayName("", "Marco", true)).toBe("");
  });
  it("riconosce le e-mail", () => {
    expect(looksLikeEmail("a@b.co")).toBe(true);
    expect(looksLikeEmail("Marco")).toBe(false);
  });
});
