#!/usr/bin/env python3
"""Validate the static portfolio before it can be published."""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


class PortfolioParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.identifiers = []
        self.fragments = []
        self.external_links = []
        self.policies = []
        self.stylesheets = []
        self.inline_handlers = []
        self.inline_scripts = []
        self.language = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)

        if tag == "html":
            self.language = attributes.get("lang")
        if "id" in attributes:
            self.identifiers.append(attributes["id"])
        for name in attributes:
            if name.lower().startswith("on"):
                self.inline_handlers.append(name)

        if tag == "meta" and attributes.get("http-equiv", "").lower() == "content-security-policy":
            self.policies.append(attributes.get("content", ""))
        elif tag == "link" and attributes.get("rel") == "stylesheet":
            self.stylesheets.append(attributes.get("href", ""))
        elif tag == "a":
            href = attributes.get("href", "")
            if href.startswith("#"):
                self.fragments.append(href[1:])
            elif href.startswith(("http://", "https://")):
                self.external_links.append((href, attributes))

        if tag not in VOID_ELEMENTS:
            self.stack.append((tag, attributes))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_ELEMENTS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in VOID_ELEMENTS:
            return
        if not self.stack or self.stack[-1][0] != tag:
            raise ValueError("Invalid HTML nesting near </{}>".format(tag))
        self.stack.pop()

    def handle_data(self, data):
        if self.stack and self.stack[-1][0] == "script" and data.strip():
            self.inline_scripts.append(data.strip())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    for name in ("index.html", "styles.css", "script.js", "favicon.svg"):
        asset = ROOT / name
        require(asset.is_file() and asset.stat().st_size > 0, "Missing or empty asset: " + name)

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
    parser = PortfolioParser()
    parser.feed(html)
    parser.close()

    require(not parser.stack, "Unclosed HTML elements")
    require(parser.language == "en", "Document language must be declared")
    require(not parser.inline_handlers, "Inline event handlers are prohibited")
    require(not parser.inline_scripts, "Inline scripts are prohibited")
    require(len(parser.policies) == 1, "Exactly one Content Security Policy is required")
    require(css.count("{") == css.count("}"), "Unbalanced CSS blocks")
    require("@import" not in css, "Avoid render-blocking stylesheet imports")

    duplicates = [name for name, count in Counter(parser.identifiers).items() if count > 1]
    require(not duplicates, "Duplicate HTML identifiers: " + ", ".join(duplicates))
    missing = set(parser.fragments) - set(parser.identifiers)
    require(not missing, "Broken internal navigation: " + ", ".join(sorted(missing)))

    policy = parser.policies[0]
    required_directives = (
        "default-src 'self'",
        "script-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "upgrade-insecure-requests",
    )
    for directive in required_directives:
        require(directive in policy, "Missing CSP directive: " + directive)
    require("'unsafe-inline'" not in policy and "'unsafe-eval'" not in policy,
            "Unsafe CSP exceptions are prohibited")

    for href, attributes in parser.external_links:
        require(href.startswith("https://"), "External links must use HTTPS: " + href)
        if attributes.get("target") == "_blank":
            protections = set(attributes.get("rel", "").split())
            require({"noopener", "noreferrer"}.issubset(protections),
                    "External link is missing opener protection: " + href)

    references = re.findall(r"^\s+uses:\s+([^\s#]+)", workflow, re.MULTILINE)
    require(bool(references), "No GitHub Actions were found in the deployment workflow")
    for reference in references:
        require(re.fullmatch(r"[^@]+@[0-9a-f]{40}", reference) is not None,
                "GitHub Action must be pinned to an immutable commit: " + reference)

    print("Portfolio security, HTML integrity, navigation, external links, and action pins verified.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print("Portfolio validation failed: {}".format(error), file=sys.stderr)
        raise SystemExit(1)
