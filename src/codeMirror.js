import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";

// Add a mapping for common language aliases or class names
const languageMap = {
  javascript: javascript,
  python: python,
  java: java,
  rust: rust,
  cpp: cpp,
  css: css,
  html: html,
  json: json,
  markdown: markdown,
  php: php,
  sql: sql,
  xml: xml,
  // Add more mappings as needed
};

// Initialize CodeMirror
window.initCodeMirror = (elementId, code, language) => {
  // Get the language extension from the map, or default to plain text
  const languageExtension = languageMap[language] ? languageMap[language]() : [];

  new EditorView({
    state: EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        languageExtension,
        oneDark,
        EditorView.editable.of(false), // Correct way to make it read-only
      ],
    }),
    parent: document.getElementById(elementId),
  });
};
