# Europe's temperature outlook

A live ECMWF ensemble forecast for Europe, displayed in an anywidget inside
manywidgets' Fullscreen container. The map opens on a date about one week ahead.
A daily timeline covers the next available 12 UTC forecasts, up to fourteen days.
Click a place to see its temperature range through that period.

## Run the example

From the repository root:

```sh
npm ci
npm run build
npm run build:forecast
jupyter nbconvert --to notebook --execute --inplace docs/examples/ensemble-forecast.ipynb
```

The notebook embeds the renderer and styles in its widget state. No Python
kernel is needed on the exported page. WebGL2 and network access to the public
Zarr store and basemap are required.

## Configure from Python

Import `EuropeForecast` from the example's `forecast` folder, as shown in the
notebook. This wrapper is example code, not an installed manywidgets API.

```python
forecast = EuropeForecast(
    region_name="Switzerland",
    bounds=[5.9, 45.8, 10.6, 47.9],
    locations=[
        {"name": "Zurich", "lon": 8.542, "lat": 47.377},
        {"name": "Geneva", "lon": 6.143, "lat": 46.204},
    ],
    initial_location="Zurich",
    forecast_days=7,
    day_index=0,
    temperature_range=[-5, 25],
    spread_range=[0, 6],
    temperature_colors=["#607faa", "#e8e9c1", "#be6454"],
)
Fullscreen(forecast)
```

| Option | Default | Meaning |
| --- | --- | --- |
| `store_url` | Public dynamical.org ECMWF store | Absolute HTTP(S) URL of the Zarr root. Accepts compatible copies or mirrors. |
| `region_name` | `"Europe"` | Heading, reset button and map description. |
| `bounds` | `[-25, 34, 45, 72]` | West, south, east, north in degrees. Sets the starting view, clickable region and chunk filter. |
| `locations` | 13 European cities | Dictionaries with unique `name`, `lon` and `lat`, all within bounds. If omitted, default cities are filtered to the bounds. At least one is required. |
| `initial_location` | First location | Name of the starting location. Also used to check recent runs. |
| `forecast_days` | `14` | Future outlook length, from 1 to 14 days. The archive may provide fewer dates. |
| `temperature_range` | `[-10, 40]` | Map and legend endpoints in °C. |
| `spread_range` | `[0, 10]` | Map and legend endpoints in °C, with a nonnegative minimum. |
| `temperature_colors`, `spread_colors` | Existing five-color ramps | At least two `#RRGGBB` colors, evenly spaced across the range. |

These are constructor options. Python validates them and syncs a single `config`
object. Create a new widget to change them. `defaults.json` supplies the defaults
for both Python and TypeScript. Bounds cannot cross the antimeridian and must
stay within ±85° latitude, matching the basemap's usable area.

The live traits remain linkable to other widgets:

- `day_index`: zero-based timeline index. Initially `-1` selects about a week ahead. An index beyond the available timeline is clamped to the final date.
- `metric`: `"mean"` or `"spread"`.
- `playing`: starts or pauses playback after the forecast loads. Loading a run pauses playback.

Region and palette options do not change the source variable, units or grid.
The adapter still expects dynamical.org's ECMWF temperature archive with 51
members. To use a compatible mirror, pass `store_url="https://your-host.example/ecmwf.zarr"`.
The browser must be able to read it, with cross-origin requests allowed (CORS).
Pass the store root without query parameters, a fragment or embedded credentials.
The mirror must preserve the Zarr v3 metadata, variables, dimension order,
coordinate conventions, units, grid and chunk layout of the original archive.
The existing format checks still run, and the archive must contain recent runs.
Supporting a different Zarr layout requires a data adapter change.

## Choosing a current run

On each mount, the browser revalidates the store metadata and time coordinates.
It tries the newest three runs within the last 72 hours, newest first, checking
temperature values at the configured starting location across all displayed days and all 51 members.
This verifies one location, not complete global ingestion. Missing map pixels and local
forecast values remain missing. A stale archive or unavailable recent runs
produce an error.

Dates come from `init_time` and `lead_time`. The timeline contains only future
12 UTC snapshots, at most fourteen. A run must cover at least seven future days, or the requested horizon if shorter.
By default, the selected date starts about seven days from opening. The run timestamp is
visible and doubles as a refresh button. Returning to a tab after 30 minutes
checks the source again.

## Data and rendering

- [Dynamical catalog](https://dynamical.org/catalog/ecmwf-ifs-ens-forecast-15-day-0-25-degree/) documents the variables, units, dates and chunking.
- [Public Zarr metadata](https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/dynamical/ecmwf-ifs-ens-forecast-15-day-0-25-degree/v0.1.0.zarr/zarr.json) is fetched directly from S3.
- [The upstream deck.gl-raster example](https://github.com/developmentseed/deck.gl-raster/tree/main/examples/dynamical-zarr-ecmwf) uses the same Zarr archive.
- [OpenFreeMap](https://openfreemap.org/quick_start/) supplies the free vector basemap. Source attribution appears on the map.

Zarrita reads Zarr chunks in the browser. ZarrLayer from deck.gl-raster renders
mean temperature and population standard deviation through deck.gl, interleaved
with MapLibre. Water is drawn over the raster to focus on land. The raster is
limited to chunks intersecting the configured bounds, which default to Europe.
Boundary chunks can extend slightly beyond those bounds.

Each source chunk contains 85 leads, 51 members and 32 by 32 spatial cells,
about 17 MiB uncompressed. Three concurrent tile reads and an 80-tile cache limit
working memory. The browser caches mean and spread summaries for every lead time in memory.
Each tile has one 2D GPU texture; switching dates or map layers uploads the
selected cached slice without another forecast download. This archive has no spatial overviews,
so the first Europe-wide view can transfer substantially more data than a
regional map. A loading message stays visible while tiles arrive.

Local point reads use the nearest 0.25° grid cell. The chart retains only mean,
10th and 90th percentiles, with a twelve-point cache. Missing members invalidate
the corresponding value. There is no interpolation or elevation correction.
The values are instantaneous temperature at 12 UTC, not daily maxima. Ensemble
ranges describe the members and are not calibrated prediction intervals.

Rendering uses deck.gl-raster’s built-in `CreateTexture`, `FilterNoDataVal`,
`LinearRescale` and `Colormap` modules. Missing summaries are encoded with a
finite sentinel before upload. A shared colormap texture samples the two legend
ramps into 256 colors each.

The raster affine treats coordinates as cell centres. Colours and legends share
the configured ranges and palettes. Values outside those ranges use the end
colours. The source grid and units are checked before rendering.

## Theming

The controls, chart, legend panels and basemap use manywidgets' `--mw-*` theme
tokens. They inherit a parent theme or follow the host page's light/dark mode.
To set a Radix theme explicitly:

```python
from manywidgets.themes import radix_theme

forecast = EuropeForecast(
    theme=radix_theme(appearance="dark", accent="green", gray="sage")
)
```

When supplying an explicit Radix theme, choose the appearance that matches your
host. Host color variables retain their usual precedence over Radix semantic
colors. The basemap updates its paint colors when theme tokens change, retaining
loaded forecast tiles. Temperature and spread ramps remain fixed so their legends mean the same
thing in either appearance.

## Code structure

- `__init__.py` validates notebook options and defines the synced traits.
- `defaults.json` and `config.ts` define the shared display settings.
- `widget.ts` mounts the view and controller, observes size changes, and disposes them.
- `view.ts` owns markup, element references, controls, legends and chart display.
- `controller.ts` handles model changes, forecast and point requests, playback and selection restoration.
- `map.ts` owns MapLibre, raster tile loading, the location marker and GPU cleanup.
- `data.ts` reads and summarizes Zarr data. `chart.ts` and `basemap.ts` handle their respective rendering details.
- `raster.ts` prepares texture slices and palettes for the library’s built-in rendering pipeline.
- `types.ts` names the forecast data and selection types shared between modules.

The view emits user actions to the controller. The controller updates the view
and map; neither rendering module reads the widget model. Each module releases
the resources and listeners it creates. Controller tests cover request races,
playback readiness, responsive remounts and disposal during a fetch.
