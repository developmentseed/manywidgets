import type { RenderProps } from "@anywidget/types";
import { onChanges } from "@manywidgets/core";

interface StatModel {
  label: string;
  value: unknown;
  unit: string;
  delta: unknown;
}

function render({ model, el }: RenderProps<StatModel>): void {
  const card = document.createElement("div");
  card.className = "manywidgets-stat";

  const labelEl = document.createElement("div");
  labelEl.className = "manywidgets-stat__label";

  const valueRow = document.createElement("div");
  valueRow.className = "manywidgets-stat__value-row";
  const valueEl = document.createElement("span");
  valueEl.className = "manywidgets-stat__value";
  const unitEl = document.createElement("span");
  unitEl.className = "manywidgets-stat__unit";
  valueRow.appendChild(valueEl);
  valueRow.appendChild(unitEl);

  const deltaEl = document.createElement("div");
  deltaEl.className = "manywidgets-stat__delta";

  card.appendChild(labelEl);
  card.appendChild(valueRow);
  card.appendChild(deltaEl);
  el.appendChild(card);

  function update(): void {
    labelEl.textContent = model.get("label");
    valueEl.textContent = String(model.get("value"));
    unitEl.textContent = model.get("unit");

    const delta = model.get("delta");
    if (delta == null || delta === "") {
      deltaEl.textContent = "";
      deltaEl.className = "manywidgets-stat__delta";
      return;
    }
    const n = Number(delta);
    const sign = n > 0 ? "▲" : n < 0 ? "▼" : "•";
    const dir = n > 0 ? "up" : n < 0 ? "down" : "flat";
    deltaEl.textContent = `${sign} ${Math.abs(n)}`;
    deltaEl.className = `manywidgets-stat__delta manywidgets-stat__delta--${dir}`;
  }

  update();
  onChanges(model, ["label", "value", "unit", "delta"], update);
}

export default { render };
