import { describe, expect, it } from "vitest";
import { fakeHost, fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

const V1 = { longitude: 1, latitude: 2, zoom: 3 };
const V2 = { longitude: 10, latitude: 20, zoom: 5 };

function setup(state: Record<string, unknown> = {}, before = {}, after = {}) {
  const beforeMap = fakeModel(before, { model_id: "beforeMap" });
  const afterMap = fakeModel(after, { model_id: "afterMap" });
  const cleanupReg = installHostRegistry([beforeMap, afterMap]);
  const host = fakeHost();
  const el = mountEl();
  const model = fakeModel({
    before: "IPY_MODEL_beforeMap",
    after: "IPY_MODEL_afterMap",
    position: 0.5,
    orientation: "vertical",
    sync_views: true,
    height: "500px",
    initial_view: "before",
    ...state,
  });
  return { beforeMap, afterMap, host, el, model, cleanup: cleanupReg };
}

/** Count change:view_state dispatches on a model (proxy for "writes"). */
function countChanges(m: ReturnType<typeof fakeModel>): () => number {
  let n = 0;
  m.on("change:view_state", () => n++);
  return () => n;
}

describe("MapCompare", () => {
  it("mounts before on top and after on bottom, with a handle and clip", async () => {
    const { host, el, model, cleanup } = setup();
    const dispose = await widget.render({ model, el, host } as never);

    const top = el.querySelector<HTMLElement>(".mc__map--top")!;
    const bottom = el.querySelector<HTMLElement>(".mc__map--bottom")!;
    const handle = el.querySelector<HTMLElement>(".mc__handle")!;
    expect(top.getAttribute("data-child")).toBe("IPY_MODEL_beforeMap");
    expect(bottom.getAttribute("data-child")).toBe("IPY_MODEL_afterMap");
    expect(handle).toBeTruthy();
    // 50% → reveal left half of top map.
    expect(top.style.clipPath).toBe("inset(0 50% 0 0)");
    expect(handle.style.left).toBe("50%");
    dispose();
    cleanup();
  });

  it("re-applies the clip when position changes (slider-driven)", async () => {
    const { host, el, model, cleanup } = setup();
    const dispose = await widget.render({ model, el, host } as never);
    model.set("position", 0.25);
    const top = el.querySelector<HTMLElement>(".mc__map--top")!;
    expect(top.style.clipPath).toBe("inset(0 75% 0 0)");
    expect(el.querySelector<HTMLElement>(".mc__handle")!.style.left).toBe("25%");
    dispose();
    cleanup();
  });

  it("switches axis for horizontal orientation", async () => {
    const { host, el, model, cleanup } = setup({ orientation: "horizontal" });
    const dispose = await widget.render({ model, el, host } as never);
    const top = el.querySelector<HTMLElement>(".mc__map--top")!;
    const handle = el.querySelector<HTMLElement>(".mc__handle")!;
    expect(top.style.clipPath).toBe("inset(0 0 50% 0)");
    expect(handle.classList.contains("mc__handle--horizontal")).toBe(true);
    expect(handle.style.top).toBe("50%");
    dispose();
    cleanup();
  });

  it("updates position on drag and saves on release", async () => {
    const { host, el, model, cleanup } = setup();
    const dispose = await widget.render({ model, el, host } as never);
    const container = el.querySelector<HTMLElement>(".manywidgets-mapcompare__container")!;
    const handle = el.querySelector<HTMLElement>(".mc__handle")!;
    // jsdom returns a zero rect; provide a real one so position math works.
    container.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }) as DOMRect;

    const savedBefore = model.saved;
    handle.dispatchEvent(new MouseEvent("pointerdown", { clientX: 100, bubbles: true }));
    handle.dispatchEvent(new MouseEvent("pointermove", { clientX: 50, bubbles: true }));
    expect(model.get("position")).toBeCloseTo(0.25);
    expect(el.querySelector<HTMLElement>(".mc__map--top")!.style.clipPath).toBe("inset(0 75% 0 0)");
    handle.dispatchEvent(new MouseEvent("pointerup", { clientX: 50, bubbles: true }));
    expect(model.saved).toBe(savedBefore + 1);
    dispose();
    cleanup();
  });

  it("aligns the after map to the before map on load", async () => {
    const { afterMap, host, el, model, cleanup } = setup({}, { view_state: V1 }, {});
    const dispose = await widget.render({ model, el, host } as never);
    expect(afterMap.get("view_state")).toEqual(V1);
    dispose();
    cleanup();
  });

  it("mirrors a pan from before→after without an echo loop", async () => {
    const { beforeMap, afterMap, host, el, model, cleanup } = setup({}, { view_state: V1 }, { view_state: V1 });
    const dispose = await widget.render({ model, el, host } as never);

    const beforeChanges = countChanges(beforeMap);
    const afterChanges = countChanges(afterMap);

    // Simulate a user pan on the before map.
    beforeMap.set("view_state", V2);

    expect(afterMap.get("view_state")).toEqual(V2); // after followed
    expect(beforeChanges()).toBe(1); // only our own set — no echo back
    expect(afterChanges()).toBe(1); // mirrored exactly once
    dispose();
    cleanup();
  });

  it("mirrors a pan from after→before too", async () => {
    const { beforeMap, afterMap, host, el, model, cleanup } = setup({}, { view_state: V1 }, { view_state: V1 });
    const dispose = await widget.render({ model, el, host } as never);
    afterMap.set("view_state", V2);
    expect(beforeMap.get("view_state")).toEqual(V2);
    dispose();
    cleanup();
  });

  it("fans the camera sync out to every proxy of a map", async () => {
    const before1 = fakeModel({ view_state: V1 }, { model_id: "beforeMap" });
    const before2 = fakeModel({ view_state: V1 }, { model_id: "beforeMap" });
    const afterMap = fakeModel({ view_state: V1 }, { model_id: "afterMap" });
    const cleanup = installHostRegistry([before1, before2, afterMap]);
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel({
      before: "IPY_MODEL_beforeMap",
      after: "IPY_MODEL_afterMap",
      position: 0.5,
      orientation: "vertical",
      sync_views: true,
      height: "500px",
      initial_view: "before",
    });
    const dispose = await widget.render({ model, el, host } as never);

    afterMap.set("view_state", V2);
    expect(before1.get("view_state")).toEqual(V2);
    expect(before2.get("view_state")).toEqual(V2);
    dispose();
    cleanup();
  });

  it("does not sync when sync_views is false", async () => {
    const { afterMap, host, el, model, cleanup } = setup({ sync_views: false }, { view_state: V1 }, { view_state: V2 });
    const dispose = await widget.render({ model, el, host } as never);
    expect(afterMap.get("view_state")).toEqual(V2); // untouched
    dispose();
    cleanup();
  });
});
