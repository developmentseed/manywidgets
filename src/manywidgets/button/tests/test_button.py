from manywidgets import Button


def test_defaults_and_sync():
    b = Button()
    assert b.clicks == 0 and b.label == "Button"
    for name in ("clicks", "label", "widget_id"):
        assert b.trait_metadata(name, "sync") is True


def test_on_click_fires_on_increment():
    b = Button()
    seen = []
    b.on_click(lambda w: seen.append(w))
    b.clicks += 1
    assert seen == [b]
    b.clicks += 1
    assert len(seen) == 2


def test_on_click_remove():
    b = Button()
    calls = []
    cb = lambda w: calls.append(1)
    b.on_click(cb)
    b.on_click(cb, remove=True)
    b.clicks += 1
    assert calls == []


def test_no_fire_when_not_increasing():
    b = Button(clicks=5)
    calls = []
    b.on_click(lambda w: calls.append(1))
    b.clicks = 3  # decrease -> no callback
    assert calls == []


def test_auto_widget_id_prefix():
    assert Button().widget_id.startswith("button_")
