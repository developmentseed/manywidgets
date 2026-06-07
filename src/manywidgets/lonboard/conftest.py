"""Skip the lonboard test subtree when the optional ``lonboard`` extra is absent.

``manywidgets.lonboard.__init__`` deliberately raises a friendly ``ImportError``
when lonboard isn't installed. Under ``--import-mode=importlib`` pytest imports a
test module through its package path, so that guard fires at *collection* time —
before the module's own ``pytest.importorskip("lonboard")`` can run. This conftest
ignores the whole subtree up front when lonboard is unavailable (e.g. the core CI
test job, which doesn't install the extra).
"""

import importlib.util

_HAS_LONBOARD = importlib.util.find_spec("lonboard") is not None


def pytest_ignore_collect(collection_path, config):
    # Only applies to paths under this conftest's directory (the lonboard subtree).
    if not _HAS_LONBOARD:
        return True
    return None
