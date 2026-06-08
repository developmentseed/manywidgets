"""``manywidgets`` command-line entry point.

Currently exposes a single subcommand, ``install-skill``, which copies the
bundled agent skill (``manywidgets/skill/``) into a location your coding agent
discovers. Claude Code looks in ``.claude/skills/`` (project) and
``~/.claude/skills/`` (personal), but the skill is plain Markdown — use
``--path`` to drop it wherever another agent expects it.

    manywidgets install-skill                 # ./.claude/skills/manywidgets/
    manywidgets install-skill --user          # ~/.claude/skills/manywidgets/
    manywidgets install-skill --path DIR      # DIR/manywidgets/
    manywidgets install-skill --force         # overwrite an existing copy
"""

from __future__ import annotations

import argparse
import pathlib
import shutil
import sys
from importlib import resources


def _bundled_skill_dir() -> pathlib.Path:
    """Path to the skill files shipped inside the installed package."""
    return pathlib.Path(str(resources.files("manywidgets") / "skill"))


def _resolve_target(args: argparse.Namespace) -> pathlib.Path:
    """Where the ``manywidgets/`` skill folder should be written."""
    if args.path:
        base = pathlib.Path(args.path).expanduser()
    elif args.user:
        base = pathlib.Path.home() / ".claude" / "skills"
    else:
        base = pathlib.Path.cwd() / ".claude" / "skills"
    return base / "manywidgets"


def install_skill(args: argparse.Namespace) -> int:
    src = _bundled_skill_dir()
    if not (src / "SKILL.md").is_file():
        print(
            f"error: bundled skill not found at {src}. "
            "Reinstall manywidgets, or run from a source checkout after "
            "`npm run skill:gen`.",
            file=sys.stderr,
        )
        return 1

    dest = _resolve_target(args)
    if dest.exists():
        if not args.force:
            print(
                f"error: {dest} already exists. Re-run with --force to overwrite.",
                file=sys.stderr,
            )
            return 1
        shutil.rmtree(dest)

    dest.parent.mkdir(parents=True, exist_ok=True)
    # Copy only the skill content (SKILL.md + references/*.md), not stray files.
    shutil.copytree(
        src,
        dest,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )
    print(f"Installed manywidgets skill to {dest}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="manywidgets")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser(
        "install-skill",
        help="Copy the bundled agent skill into a discoverable location.",
        description=install_skill.__doc__,
    )
    where = p.add_mutually_exclusive_group()
    where.add_argument(
        "--user",
        action="store_true",
        help="Install to ~/.claude/skills/ instead of the current project.",
    )
    where.add_argument(
        "--path",
        metavar="DIR",
        help="Install under an arbitrary directory (for agents other than Claude).",
    )
    p.add_argument(
        "--force",
        action="store_true",
        help="Overwrite an existing installation.",
    )
    p.set_defaults(func=install_skill)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
