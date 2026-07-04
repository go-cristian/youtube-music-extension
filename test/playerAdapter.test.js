import assert from "node:assert/strict";
import test from "node:test";

import { readFirstAttribute, readFirstText } from "../src/playerAdapter.js";

function element(text = "", attributes = {}) {
  return {
    textContent: text,
    getAttribute(name) {
      return attributes[name] ?? null;
    },
  };
}

function documentWithMatches(matches) {
  return {
    querySelector(selector) {
      return matches[selector] ?? null;
    },
  };
}

test("readFirstText returns the first non-empty selector match", () => {
  const doc = documentWithMatches({
    ".empty": element("   "),
    ".title": element("  Midnight City  "),
    ".other": element("Other"),
  });

  assert.equal(readFirstText(doc, [".empty", ".title", ".other"]), "Midnight City");
});

test("readFirstText returns an empty string when no selector has text", () => {
  const doc = documentWithMatches({
    ".empty": element("   "),
  });

  assert.equal(readFirstText(doc, [".missing", ".empty"]), "");
});

test("readFirstAttribute returns the first non-empty attribute match", () => {
  const doc = documentWithMatches({
    ".missing-src": element("", { src: "" }),
    ".art": element("", { src: " https://example.test/art.jpg " }),
  });

  assert.equal(readFirstAttribute(doc, [".missing-src", ".art"], "src"), "https://example.test/art.jpg");
});
