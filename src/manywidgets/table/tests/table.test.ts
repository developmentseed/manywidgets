import { describe, expect, it } from "vitest";
import { fakeModel, mountEl } from "@manywidgets/test-utils";
import widget, { formatBytes, formatCell, formatDatetime } from "../src/index";

const rows = [
  { id: "a", name: "Alpha", size: 1500, when: "2025-10-29T11:11:30Z" },
  { id: "b", name: "beta", size: 2_400_000_000, when: "2025-01-02T00:00:00Z" },
  { id: "c", name: "Gamma", size: null, when: null },
];

function base(state: Record<string, unknown> = {}) {
  return fakeModel({
    rows,
    columns: [],
    id_key: "id",
    selected: "",
    hovered: "",
    max_height: "200px",
    sortable: true,
    title: "",
    empty_text: "No rows",
    ...state,
  });
}

const cells = (el: HTMLElement) =>
  Array.from(el.querySelectorAll(".manywidgets-table__row")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td) => td.textContent),
  );

describe("Table", () => {
  it("renders rows with explicit columns and formats", () => {
    const el = mountEl();
    const model = base({
      columns: [
        { key: "name", label: "Name" },
        { key: "size", format: "bytes" },
        { key: "when", format: "datetime" },
      ],
      title: "Things",
    });
    widget.render({ model, el } as never);

    const ths = Array.from(el.querySelectorAll(".manywidgets-table__th")).map((t) => t.textContent);
    expect(ths).toEqual(["Name", "size", "when"]);
    expect(cells(el)[0]).toEqual(["Alpha", "1.5 KB", "2025-10-29 11:11:30"]);
    expect(cells(el)[1]).toEqual(["beta", "2.4 GB", "2025-01-02 00:00:00"]);
    expect(cells(el)[2]).toEqual(["Gamma", "", ""]);
    expect(el.querySelector(".manywidgets-table__title")!.textContent).toBe("Things");
    expect(el.querySelector<HTMLElement>(".manywidgets-table__scroll")!.style.maxHeight).toBe("200px");
  });

  it("derives columns from the first row when none are given", () => {
    const el = mountEl();
    widget.render({ model: base(), el } as never);
    const ths = Array.from(el.querySelectorAll(".manywidgets-table__th")).map((t) => t.textContent);
    expect(ths).toEqual(["id", "name", "size", "when"]);
  });

  it("sorts by clicking a header (numeric-aware, nulls last) and toggles direction", () => {
    const el = mountEl();
    // Sort by a numeric column but read back the (unformatted) name column, so
    // the assertion does not depend on the test runner's number locale.
    widget.render({ model: base({ columns: [{ key: "size", format: "number" }, { key: "name" }] }), el } as never);
    const th = el.querySelector<HTMLElement>(".manywidgets-table__th")!;
    th.click();
    expect(cells(el).map((r) => r[1])).toEqual(["Alpha", "beta", "Gamma"]);
    expect(el.querySelector(".manywidgets-table__th")!.classList.contains("is-sorted-asc")).toBe(true);
    el.querySelector<HTMLElement>(".manywidgets-table__th")!.click();
    expect(cells(el).map((r) => r[1])).toEqual(["beta", "Alpha", "Gamma"]);
    expect(el.querySelector(".manywidgets-table__th")!.classList.contains("is-sorted-desc")).toBe(true);
  });

  it("does not sort when sortable is false", () => {
    const el = mountEl();
    widget.render({ model: base({ sortable: false, columns: [{ key: "name" }] }), el } as never);
    el.querySelector<HTMLElement>(".manywidgets-table__th")!.click();
    expect(cells(el).map((r) => r[0])).toEqual(["Alpha", "beta", "Gamma"]);
  });

  it("row click writes selected and saves; clicking again keeps it", () => {
    const el = mountEl();
    const model = base();
    widget.render({ model, el } as never);
    const row = el.querySelectorAll<HTMLElement>(".manywidgets-table__row")[1];
    row.click();
    expect(model.get("selected")).toBe("b");
    expect(model.saved).toBe(1);
    expect(row.classList.contains("is-selected")).toBe(true);
    row.click();
    expect(model.get("selected")).toBe("b");
    expect(model.saved).toBe(1);
  });

  it("highlights the row when selected changes from outside", () => {
    const el = mountEl();
    const model = base();
    widget.render({ model, el } as never);
    model.set("selected", "c");
    const sel = Array.from(el.querySelectorAll(".manywidgets-table__row")).filter((r) =>
      r.classList.contains("is-selected"),
    );
    expect(sel.length).toBe(1);
    expect((sel[0] as HTMLElement).dataset.id).toBe("c");
  });

  it("uses the row index as id when id_key is empty", () => {
    const el = mountEl();
    const model = base({ id_key: "" });
    widget.render({ model, el } as never);
    el.querySelectorAll<HTMLElement>(".manywidgets-table__row")[2].click();
    expect(model.get("selected")).toBe("2");
  });

  it("tracks hovered on mouseenter / mouseleave", () => {
    const el = mountEl();
    const model = base();
    widget.render({ model, el } as never);
    const row = el.querySelectorAll<HTMLElement>(".manywidgets-table__row")[0];
    row.dispatchEvent(new Event("mouseenter"));
    expect(model.get("hovered")).toBe("a");
    expect(row.classList.contains("is-hovered")).toBe(true);
    el.querySelector("tbody")!.dispatchEvent(new Event("mouseleave"));
    expect(model.get("hovered")).toBe("");
  });

  it("rebuilds on rows change and shows empty_text for no rows", () => {
    const el = mountEl();
    const model = base();
    widget.render({ model, el } as never);
    model.set("rows", []);
    expect(el.querySelector<HTMLElement>(".manywidgets-table__empty")!.style.display).toBe("");
    expect(el.querySelector(".manywidgets-table__empty")!.textContent).toBe("No rows");
    model.set("rows", [{ id: "z", name: "Zed" }]);
    expect(el.querySelectorAll(".manywidgets-table__row").length).toBe(1);
    expect(el.querySelector<HTMLElement>(".manywidgets-table__empty")!.style.display).toBe("none");
  });
});

describe("Table formatters", () => {
  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1200)).toBe("1.2 KB");
    expect(formatBytes(5_300_000_000)).toBe("5.3 GB");
    expect(formatBytes(123_456_789_000)).toBe("123 GB");
  });

  it("formats datetimes in UTC and passes through junk", () => {
    expect(formatDatetime("2025-10-29T11:11:30.123Z")).toBe("2025-10-29 11:11:30");
    expect(formatDatetime("not a date")).toBe("not a date");
    expect(formatDatetime(null)).toBe("");
  });

  it("formats numbers with digits", () => {
    expect(formatCell(3.14159, { key: "x", format: "number", digits: 2 })).toBe((3.14).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    expect(formatCell("n/a", { key: "x", format: "number" })).toBe("n/a");
    expect(formatCell(undefined, { key: "x" })).toBe("");
  });
});
