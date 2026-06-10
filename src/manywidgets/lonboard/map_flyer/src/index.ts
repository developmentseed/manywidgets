import type { RenderProps } from "@anywidget/types";
import { asNumber, idOf, type ModelHandle, onChanges, resolveModel } from "@manywidgets/core";

interface Location {
  label?: string;
  longitude?: number;
  latitude?: number;
  zoom?: number;
  [key: string]: unknown;
}

interface MapFlyerModel {
  map: unknown;
  locations: Location[];
  duration: number;
  label: string;
}

// Build the content of lonboard's "fly-to" custom message from a preset. lonboard
// passes this object straight to deck.gl's flyTo (FlyToInterpolator + setViewState),
// so we forward every camera key on the preset and stamp the transition duration.
function flyToMessage(loc: Location, duration: number): Record<string, unknown> {
  const { label: _label, ...camera } = loc;
  return { type: "fly-to", transitionDuration: duration, ...camera };
}

async function render({ model, el }: RenderProps<MapFlyerModel>): Promise<void> {
  const container = document.createElement("div");
  container.className = "manywidgets-mapflyer";

  const heading = document.createElement("div");
  heading.className = "manywidgets-mapflyer__label";

  const buttons = document.createElement("div");
  buttons.className = "manywidgets-mapflyer__buttons";

  container.append(heading, buttons);
  el.appendChild(container);

  let handle: ModelHandle | null = null;
  try {
    handle = await resolveModel(model, idOf(model.get("map")));
  } catch (err) {
    console.warn("[manywidgets:map-flyer] could not resolve map", err);
  }

  function flyTo(loc: Location): void {
    if (!handle) return;
    handle.sendCustom(flyToMessage(loc, asNumber(model.get("duration"), 4000)));
  }

  function renderButtons(): void {
    buttons.replaceChildren();
    const locations = model.get("locations");
    const list = Array.isArray(locations) ? locations : [];
    list.forEach((loc, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "manywidgets-mapflyer__button";
      btn.textContent = loc.label || `Location ${i + 1}`;
      btn.addEventListener("click", () => flyTo(loc));
      buttons.appendChild(btn);
    });
  }

  function renderLabel(): void {
    const text = String(model.get("label") ?? "");
    heading.textContent = text;
    heading.style.display = text ? "" : "none";
  }

  renderLabel();
  renderButtons();
  onChanges(model, ["label"], renderLabel);
  onChanges(model, ["locations"], renderButtons);
}

export default { render };
