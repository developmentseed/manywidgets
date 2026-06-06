import { afterEach, describe, expect, it, vi } from "vitest";
import {
  asNumber,
  onChanges,
  renderChild,
  resolveModel,
  safeSaveChanges,
  setByPath,
} from "@manywidgets/core";
import { fakeHost, fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";

describe("asNumber", () => {
  it("coerces and falls back", () => {
    expect(asNumber(3)).toBe(3);
    expect(asNumber("4.5")).toBe(4.5);
    expect(asNumber("nope", 7)).toBe(7);
    expect(asNumber(undefined, 0)).toBe(0);
  });
});

describe("setByPath", () => {
  it("sets leaf keys", () => {
    const m = fakeModel({ a: 1 });
    setByPath(m as never, "a", 9);
    expect(m.get("a")).toBe(9);
  });

  it("merges nested paths without mutating siblings", () => {
    const m = fakeModel({ view_state: { zoom: 1, pitch: 30 } });
    setByPath(m as never, "view_state.zoom", 5);
    expect(m.get("view_state")).toEqual({ zoom: 5, pitch: 30 });
  });
});

describe("onChanges", () => {
  it("registers one listener per trait (static-emitter safe)", () => {
    const m = fakeModel({ a: 1, b: 2 });
    let calls = 0;
    onChanges(m as never, ["a", "b"], () => {
      calls += 1;
    });
    expect(m.listenerCount("change:a")).toBe(1);
    expect(m.listenerCount("change:b")).toBe(1);
    m.set("a", 10);
    m.set("b", 20);
    expect(calls).toBe(2);
  });

  it("unsubscribe removes all listeners", () => {
    const m = fakeModel({ a: 1 });
    const off = onChanges(m as never, ["a"], () => {});
    off();
    expect(m.listenerCount("change:a")).toBe(0);
  });
});

describe("safeSaveChanges", () => {
  it("swallows errors (no kernel)", () => {
    expect(() => safeSaveChanges({ save_changes: () => { throw new Error("x"); } })).not.toThrow();
    expect(() => safeSaveChanges(null)).not.toThrow();
  });
});

describe("resolveModel (static export)", () => {
  let cleanup: () => void;
  afterEach(() => cleanup?.());

  it("resolves a root widget by widget_id, not model_id", async () => {
    // Root widgets are keyed by widget_id; their model_id is unset. This is the
    // case my initial Binder got wrong (it matched only model_id).
    const root = fakeModel({ widget_id: "w1", value: 1 });
    cleanup = installHostRegistry([root]);

    const handle = await resolveModel(fakeModel({}) as never, "w1");
    expect(handle.get("value")).toBe(1);
    handle.set("value", 42);
    expect(root.get("value")).toBe(42);
  });

  it("matches sub-model proxies by model_id and fans writes out to all", async () => {
    const p1 = fakeModel({ value: 0 }, { model_id: "layer-1" });
    const p2 = fakeModel({ value: 0 }, { model_id: "layer-1" });
    cleanup = installHostRegistry([p1, p2]);

    const handle = await resolveModel(fakeModel({}) as never, "layer-1");
    handle.set("value", 5);
    expect(p1.get("value")).toBe(5);
    expect(p2.get("value")).toBe(5);
  });
});

describe("resolveModel (live kernel)", () => {
  it("uses widget_manager.get_model", async () => {
    const target = fakeModel({ value: 11 });
    const caller = fakeModel({}, {
      widget_manager: { get_model: vi.fn(async () => target) },
    });
    const handle = await resolveModel(caller as never, "anything");
    expect(handle.get("value")).toBe(11);
  });
});

describe("renderChild", () => {
  it("static: delegates to host.renderChild and returns its dispose", async () => {
    const host = fakeHost();
    const el = mountEl();
    const dispose = await renderChild({ model: fakeModel({}), host } as never, "IPY_MODEL_x", el);
    expect(host.mounted).toEqual(["IPY_MODEL_x"]);
    expect(el.getAttribute("data-child")).toBe("IPY_MODEL_x");
    dispose();
    expect(host.disposed).toBe(1);
  });

  it("live: creates a view via widget_manager and mounts it", async () => {
    const view = { el: document.createElement("span"), remove: vi.fn() };
    const child = fakeModel({ value: 1 });
    const create_view = vi.fn(async () => view);
    const get_model = vi.fn(async () => child);
    const model = fakeModel({}, { widget_manager: { get_model, create_view } });
    const el = mountEl();

    const dispose = await renderChild({ model } as never, "IPY_MODEL_y", el);
    expect(get_model).toHaveBeenCalledWith("y"); // IPY_MODEL_ stripped
    expect(create_view).toHaveBeenCalledWith(child);
    expect(el.contains(view.el)).toBe(true);
    dispose();
    expect(view.remove).toHaveBeenCalled();
  });

  it("throws when neither a host nor a widget_manager is available", async () => {
    await expect(
      renderChild({ model: fakeModel({}) } as never, "IPY_MODEL_z", mountEl()),
    ).rejects.toThrow();
  });
});
