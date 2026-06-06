"""The lonboard subpackage is optional and import-guarded."""

import importlib.util

import pytest

_HAS_LONBOARD = importlib.util.find_spec("lonboard") is not None


@pytest.mark.skipif(_HAS_LONBOARD, reason="lonboard is installed")
def test_friendly_error_without_lonboard():
    with pytest.raises(ImportError, match=r"manywidgets\[lonboard\]"):
        import manywidgets.lonboard  # noqa: F401


@pytest.mark.skipif(not _HAS_LONBOARD, reason="lonboard not installed")
def test_subpackage_exports_when_installed():
    import manywidgets.lonboard as lon

    assert lon.LayerToggle and lon.FilterBinder and lon.LayerFilter
    # lonboard widgets are NOT in the top-level namespace (optional).
    import manywidgets

    assert "LayerToggle" not in manywidgets.__all__
