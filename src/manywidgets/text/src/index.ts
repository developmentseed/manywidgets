import type { RenderProps } from "@anywidget/types";
import { onChanges } from "@manywidgets/core";
import { marked } from "marked";

interface TextModel {
  value: string;
  markdown: boolean;
}

function render({ model, el }: RenderProps<TextModel>): void {
  const container = document.createElement("div");
  container.className = "manywidgets-text";
  el.appendChild(container);

  function update(): void {
    const value = model.get("value") ?? "";
    if (model.get("markdown")) {
      container.classList.add("manywidgets-text--markdown");
      // Notebook-authored content rendered in the author's own page.
      container.innerHTML = marked.parse(String(value), { async: false }) as string;
    } else {
      container.classList.remove("manywidgets-text--markdown");
      container.textContent = String(value);
    }
  }

  update();
  onChanges(model, ["value", "markdown"], update);
}

export default { render };
