import { describe, expect, it } from "vitest";
import { fakeModel, installHostRegistry, mountEl } from "@manywidgets/test-utils";
import widget from "../src/index";

const NYC = { label: "NYC", longitude: -74, latitude: 40.7, zoom: 10 };
const LDN = { label: "London", longitude: -0.12, latitude: 51.5, zoom: 9 };

describe("MapFlyer", () => {
  it("renders one button per location and labels them", async () => {
    const map = fakeModel({}, { model_id: "map1" });
    const cleanup = installHostRegistry([map]);
    const model = fakeModel({ map: "IPY_MODEL_map1", locations: [NYC, LDN], duration: 4000 });
    const el = mountEl();

    await widget.render({ model, el } as never);
    const buttons = el.querySelectorAll<HTMLButtonElement>(".manywidgets-mapflyer__button");
    expect([...buttons].map((b) => b.textContent)).toEqual(["NYC", "London"]);
    cleanup();
  });

  it("delivers lonboard's fly-to message to the map on click", async () => {
    const map = fakeModel({}, { model_id: "map1" });
    const cleanup = installHostRegistry([map]);
    const received: unknown[] = [];
    map.on("msg:custom", (m) => received.push(m));

    const model = fakeModel({ map: "IPY_MODEL_map1", locations: [NYC], duration: 2000 });
    const el = mountEl();
    await widget.render({ model, el } as never);

    el.querySelector<HTMLButtonElement>(".manywidgets-mapflyer__button")!.click();

    expect(received).toEqual([
      { type: "fly-to", transitionDuration: 2000, longitude: -74, latitude: 40.7, zoom: 10 },
    ]);
    cleanup();
  });

  it("fans the fly-to out to every proxy of the map", async () => {
    const p1 = fakeModel({}, { model_id: "map1" });
    const p2 = fakeModel({}, { model_id: "map1" });
    const cleanup = installHostRegistry([p1, p2]);
    let count = 0;
    p1.on("msg:custom", () => count++);
    p2.on("msg:custom", () => count++);

    const model = fakeModel({ map: "IPY_MODEL_map1", locations: [NYC], duration: 4000 });
    const el = mountEl();
    await widget.render({ model, el } as never);
    el.querySelector<HTMLButtonElement>(".manywidgets-mapflyer__button")!.click();

    expect(count).toBe(2);
    cleanup();
  });

  it("rebuilds buttons when locations change", async () => {
    const map = fakeModel({}, { model_id: "map1" });
    const cleanup = installHostRegistry([map]);
    const model = fakeModel({ map: "IPY_MODEL_map1", locations: [NYC], duration: 4000 });
    const el = mountEl();

    await widget.render({ model, el } as never);
    expect(el.querySelectorAll(".manywidgets-mapflyer__button")).toHaveLength(1);

    model.set("locations", [NYC, LDN]);
    expect(el.querySelectorAll(".manywidgets-mapflyer__button")).toHaveLength(2);
    cleanup();
  });
});
