import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeHost, fakeModel, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

const CLAIM = "__mw_fullscreen_url_claimed";

function setUrl(pathAndQuery: string): void {
  window.history.replaceState(null, "", pathAndQuery);
}

function baseState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    child: "IPY_MODEL_c",
    fullscreen: null,
    is_open: false,
    widget_id: "fullscreen_1",
    ...overrides,
  };
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[CLAIM];
  setUrl("/");
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("Fullscreen", () => {
  it("renders the inline child, does not mount the alternate layout, overlay closed", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState({ fullscreen: "IPY_MODEL_f" }));
    await widget.render({ model, el, host } as never);

    expect(host.mounted).toEqual(["IPY_MODEL_c"]);
    expect(el.classList.contains("mwfs--open")).toBe(false);
    expect(el.querySelector(".mwfs__slot")!.getAttribute("data-child")).toBe("IPY_MODEL_c");
  });

  it("expand button opens and writes the trait back", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    el.querySelector<HTMLButtonElement>(".mwfs__expand")!.click();
    expect(model.get("is_open")).toBe(true);
    expect(model.saved).toBe(1);
    expect(el.classList.contains("mwfs--open")).toBe(true);
  });

  it("opens programmatically via the trait without saving", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    model.set("is_open", true);
    expect(el.classList.contains("mwfs--open")).toBe(true);
    expect(model.saved).toBe(0);
  });

  it("lazily mounts the alternate layout once, even across reopen", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState({ fullscreen: "IPY_MODEL_f" }));
    await widget.render({ model, el, host } as never);

    model.set("is_open", true);
    await settle();
    expect(host.mounted).toEqual(["IPY_MODEL_c", "IPY_MODEL_f"]);
    expect(el.querySelector(".mwfs__content")!.getAttribute("data-child")).toBe("IPY_MODEL_f");

    model.set("is_open", false);
    model.set("is_open", true);
    await settle();
    expect(host.mounted).toEqual(["IPY_MODEL_c", "IPY_MODEL_f"]); // memoised
  });

  it("re-parents the inline slot into the overlay and back when no alternate layout", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    const slot = el.querySelector(".mwfs__slot")!;
    model.set("is_open", true);
    expect(slot.parentElement!.className).toBe("mwfs__content");
    expect(slot.getAttribute("data-child")).toBe("IPY_MODEL_c"); // same node, state intact

    model.set("is_open", false);
    expect(slot.parentElement!.className).toBe("mwfs__inline");
    expect(slot.nextElementSibling!.className).toBe("mwfs__expand");
    expect(host.mounted).toEqual(["IPY_MODEL_c"]); // never re-rendered
  });

  it("Escape closes and saves; a second Escape while closed is a no-op", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    model.set("is_open", true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(model.get("is_open")).toBe(false);
    expect(model.saved).toBe(1);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(model.saved).toBe(1); // listener removed on close
  });

  it("close button closes and saves", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    model.set("is_open", true);
    el.querySelector<HTMLButtonElement>(".mwfs__close")!.click();
    expect(model.get("is_open")).toBe(false);
    expect(model.saved).toBe(1);
  });

  it("dispose cleans up children, listeners and the overlay", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState({ fullscreen: "IPY_MODEL_f" }));
    const dispose = await widget.render({ model, el, host } as never);

    model.set("is_open", true);
    await settle();
    model.set("is_open", false);
    dispose();
    expect(host.disposed).toBe(2); // child + alternate layout
    expect(el.querySelector(".mwfs__overlay")).toBeNull();
    model.set("is_open", true); // change:is_open listener removed → no DOM reaction
    expect(el.classList.contains("mwfs--open")).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); // must not throw
  });

  it("deep link ?fullscreen=<widget_id> opens on load and normalizes the URL", async () => {
    setUrl("/?fullscreen=fullscreen_1");
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    expect(model.get("is_open")).toBe(true);
    expect(el.classList.contains("mwfs--open")).toBe(true);
    expect(window.location.search).toBe("?fullscreen=fullscreen_1");
  });

  it("deep link with a different widget_id stays closed", async () => {
    setUrl("/?fullscreen=other_widget");
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);
    expect(model.get("is_open")).toBe(false);
  });

  it("bare ?fullscreen=true opens only the first Fullscreen widget on the page", async () => {
    setUrl("/?fullscreen=true");
    const host = fakeHost();
    const modelA = fakeModel(baseState({ widget_id: "fullscreen_a" }));
    const modelB = fakeModel(baseState({ widget_id: "fullscreen_b" }));
    await widget.render({ model: modelA, el: mountEl(), host } as never);
    await widget.render({ model: modelB, el: mountEl(), host } as never);

    expect(modelA.get("is_open")).toBe(true);
    expect(modelB.get("is_open")).toBe(false);
    // URL normalized to the concrete id of the widget that claimed it.
    expect(window.location.search).toBe("?fullscreen=fullscreen_a");
  });

  it("toggling updates the URL: param added on open, removed on close", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    el.querySelector<HTMLButtonElement>(".mwfs__expand")!.click();
    expect(window.location.search).toBe("?fullscreen=fullscreen_1");
    el.querySelector<HTMLButtonElement>(".mwfs__close")!.click();
    expect(window.location.search).toBe("");
  });

  it("opens from exported is_open=true state without rewriting the URL", async () => {
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState({ is_open: true }));
    await widget.render({ model, el, host } as never);

    expect(el.classList.contains("mwfs--open")).toBe(true);
    expect(window.location.search).toBe(""); // initial sync must not touch the URL
    el.querySelector<HTMLButtonElement>(".mwfs__close")!.click();
    el.querySelector<HTMLButtonElement>(".mwfs__expand")!.click();
    expect(window.location.search).toBe("?fullscreen=fullscreen_1"); // user toggles do
  });

  it("aliases the static host registry under the new baseURI after a URL rewrite", async () => {
    // The plugin keys its per-page registry by document.baseURI; our
    // replaceState changes it, so reflectUrl must alias the old entry.
    const reg = { all: () => [] };
    (globalThis as Record<string, unknown>).__myst_anywidget_hosts = new Map([
      [document.baseURI, reg],
    ]);
    const host = fakeHost();
    const el = mountEl();
    const model = fakeModel(baseState());
    await widget.render({ model, el, host } as never);

    el.querySelector<HTMLButtonElement>(".mwfs__expand")!.click();
    const hosts = (globalThis as Record<string, unknown>).__myst_anywidget_hosts as Map<
      string,
      unknown
    >;
    expect(document.baseURI).toContain("?fullscreen=fullscreen_1");
    expect(hosts.get(document.baseURI)).toBe(reg); // same registry, new key

    el.querySelector<HTMLButtonElement>(".mwfs__close")!.click();
    expect(hosts.get(document.baseURI)).toBe(reg); // aliased back on close too
    delete (globalThis as Record<string, unknown>).__myst_anywidget_hosts;
  });

  it("never touches the URL in a live kernel (no static host)", async () => {
    setUrl("/?fullscreen=fullscreen_1");
    const spy = vi.spyOn(window.history, "replaceState");
    const el = mountEl();
    const model = fakeModel(baseState({ child: null })); // no host → no renderChild path
    await widget.render({ model, el } as never);

    expect(model.get("is_open")).toBe(false); // deep link ignored
    model.set("is_open", true);
    model.set("is_open", false);
    expect(spy).not.toHaveBeenCalled();
  });
});
