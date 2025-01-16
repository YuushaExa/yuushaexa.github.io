// ./src/codeMirror.js
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript"; // Or your preferred language

// Initialize CodeMirror
window.initCodeMirror = (elementId, code) => {
  new EditorView({
    state: EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        javascript(), // Or any other extensions you want
        // ...
      ]
    }),
    parent: document.getElementById(elementId)
  });
};
