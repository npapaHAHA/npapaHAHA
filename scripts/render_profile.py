"""Render the profile artwork. Install Pillow, then run this file from any directory."""

import argparse
import csv
from dataclasses import dataclass
from functools import lru_cache
from io import StringIO
from itertools import accumulate
import json
from math import ceil, pi, sin
from pathlib import Path
from statistics import mean
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "profile"
RAW = "https://raw.githubusercontent.com/npapaHAHA"
SOURCES = {
    "edge.json": f"{RAW}/edge-rollout-lab/main/reports/benchmark.json",
    "schedule.csv": f"{RAW}/edge-rollout-lab/main/reports/schedule.csv",
    "support.json": f"{RAW}/support-intent-classifier/main/metrics.json",
    "retail.json": f"{RAW}/repeat-purchase-ml/main/metrics.json",
}


@dataclass(frozen=True)
class Theme:
    surface: str
    panel: str
    grid: str
    border: str
    ink: str
    muted: str
    accents: tuple[str, str, str, str]


THEMES = {
    "dark": Theme(
        "#0C1719", "#142528", "#192E31", "#335053", "#F2F8F3", "#A7BFB9",
        ("#A4F5BF", "#D6BCFF", "#A6DEFC", "#F7CF93"),
    ),
    "light": Theme(
        "#F1F6EF", "#E6EFE6", "#E4ECE3", "#B9CDC0", "#162822", "#486358",
        ("#09623F", "#65449B", "#175D82", "#845111"),
    ),
}


@lru_cache
def font(size, style="body"):
    names = {
        "body": ("segoeui.ttf", "DejaVuSans.ttf"),
        "bold": ("segoeuib.ttf", "DejaVuSans-Bold.ttf"),
        "mono": ("CascadiaMono.ttf", "DejaVuSansMono.ttf"),
    }
    for name in names[style]:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    raise RuntimeError("Install Segoe UI and Cascadia Mono or the DejaVu font family.")


def label(draw, xy, text, size, color, style="body", anchor=None):
    draw.text(xy, text, font=font(size, style), fill=color, anchor=anchor)


def blend(left, right, amount):
    left_rgb = bytes.fromhex(left.lstrip("#"))
    right_rgb = bytes.fromhex(right.lstrip("#"))
    return tuple(round(a + (b - a) * amount) for a, b in zip(left_rgb, right_rgb))


def dot(draw, x, y, radius, color):
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)


def read_inputs(data_dir):
    data = {}
    for name, url in SOURCES.items():
        if data_dir:
            data[name] = (data_dir / name).read_text(encoding="utf-8-sig")
        else:
            with urlopen(url, timeout=20) as source:
                data[name] = source.read().decode("utf-8-sig")
    return data


def network_layout(schedule):
    # Positions are schematic. The vertex counts match the saved benchmark schedule.
    by_site = {}
    for row in csv.DictReader(StringIO(schedule)):
        by_site.setdefault(row["site"], set()).add(row["device_id"])

    sites = ((819, 96), (1005, 75), (959, 225), (1081, 244), (786, 251))
    if len(by_site) != len(sites):
        raise ValueError("The masthead layout expects the five sites in the benchmark.")

    clusters = []
    for (x, y), devices in zip(sites, sorted(by_site.values(), key=len, reverse=True)):
        count = len(devices)
        nodes = []
        for index in range(count):
            row, col = divmod(index, 7)
            nodes.append((x + col * 11 + row * 4, y + row * 11))
        bounds = (x - 15, y - 15, x + 103, y + (ceil(count / 7) - 1) * 11 + 15)
        path = ((718, 183), (x - 38, 183), (x - 38, y), (x - 13, y))
        clusters.append((bounds, path, nodes))
    return clusters


def point_along(path, fraction):
    lengths = [abs(b[0] - a[0]) + abs(b[1] - a[1]) for a, b in zip(path, path[1:])]
    remaining = sum(lengths) * fraction
    for a, b, length in zip(path, path[1:], lengths):
        if remaining <= length:
            ratio = remaining / length if length else 0
            return tuple(round(start + (end - start) * ratio) for start, end in zip(a, b))
        remaining -= length
    return path[-1]


def draw_masthead(theme, clusters, device_count, phase):
    width, height = 1200, 390
    art = Image.new("RGB", (width, height), theme.surface)
    draw = ImageDraw.Draw(art)
    mint = theme.accents[0]

    for x in range(600, width, 24):
        draw.line((x, 0, x, height), fill=theme.grid)
    for y in range(0, height, 24):
        draw.line((590, y, width, y), fill=theme.grid)
    draw.rectangle((0, 0, width - 1, height - 1), outline=theme.border, width=2)
    draw.line((571, 36, 571, height - 37), fill=theme.border)
    for x, y in ((31, 30), (1168, 30), (31, 359), (1168, 359)):
        draw.line((x - 6, y, x + 6, y), theme.border, width=2)
        draw.line((x, y - 6, x, y + 6), theme.border, width=2)

    dot(draw, 63, 57, 4, mint)
    label(draw, (79, 45), "ИТМО", 21, mint, "mono")
    label(draw, (50, 56), "ЕГОР", 143, theme.ink, "bold")
    label(draw, (61, 230), "Прикладной ML и бэкенд", 34, theme.ink, "bold")
    draw.line((62, 303, 517, 303), fill=theme.border)
    label(draw, (62, 326), "PYTHON   /   .NET   /   POSTGRESQL", 19, theme.muted, "mono")

    label(draw, (603, 32), "EDGE ROLLOUT LAB", 16, theme.muted, "mono")
    for index, (bounds, path, nodes) in enumerate(clusters):
        draw.line(path, fill=theme.border, width=2)
        pulse = (phase + index / len(clusters)) % 1
        x, y = point_along(path, pulse)
        dot(draw, x, y, 8, blend(theme.surface, mint, 0.30))
        dot(draw, x, y, 3, mint)
        draw.rounded_rectangle(bounds, radius=9, fill=theme.panel, outline=theme.border)
        for node, (x, y) in enumerate(nodes):
            signal = (1 + sin(2 * pi * (phase - node * 0.047 + index * 0.15))) / 2
            color = blend(theme.border, mint, 0.20 + 0.70 * signal**4)
            dot(draw, x, y, 2, color)

    draw.rounded_rectangle((603, 155, 719, 212), radius=8, fill=theme.panel, outline=mint)
    label(draw, (661, 183), "МОДЕЛИ", 17, mint, "mono", "mm")
    label(draw, (603, 343), f"{device_count} УСТРОЙСТВ  /  {len(clusters)} ПЛОЩАДОК", 17, theme.muted, "mono")
    return art


def render_masthead(name, theme, clusters, device_count):
    still = draw_masthead(theme, clusters, device_count, 0.18)
    still.save(ASSETS / f"masthead-{name}.png", optimize=True)
    frame_count = 36
    palette = still.quantize(colors=192, dither=Image.Dither.NONE)
    frames = [
        draw_masthead(theme, clusters, device_count, index / frame_count).quantize(
            palette=palette, dither=Image.Dither.NONE,
        )
        for index in range(frame_count)
    ]
    frames[0].save(
        ASSETS / f"masthead-{name}.gif", save_all=True, append_images=frames[1:],
        duration=85, loop=0, optimize=True, disposal=1,
    )


def decimal(value):
    return f"{value:.3f}".replace(".", ",")


def edge_chart(draw, theme, accent, benchmark):
    box = (441, 103, 606, 198)
    left, top, right, bottom = box
    curves = {}
    for strategy in ("fifo", "bandwidth"):
        runs = [accumulate(run["rollouts"][strategy]["daily_utility"]) for run in benchmark["runs"]]
        curves[strategy] = [0] + [mean(day) for day in zip(*runs, strict=True)]
    maximum = max(map(max, curves.values()))
    for y in range(top + 8, bottom, 27):
        draw.line((left, y, right, y), fill=theme.grid, width=2)
    for strategy, color in (("fifo", theme.muted), ("bandwidth", accent)):
        values = curves[strategy]
        points = [
            (left + i * (right - left) / (len(values) - 1), bottom - value * (bottom - top) / maximum)
            for i, value in enumerate(values)
        ]
        draw.line(points, fill=color, width=3)
        dot(draw, *points[-1], 4, color)
    label(draw, (441, 209), f"{benchmark['days']} ДНЕЙ", 15, theme.muted, "mono")


def slot_chart(draw, theme, accent):
    for index in range(20):
        row, col = divmod(index, 5)
        x, y = 450 + col * 31, 102 + row * 24
        fill = accent if index == 0 else theme.panel
        outline = accent if index == 0 else theme.border
        draw.rounded_rectangle((x, y, x + 22, y + 16), radius=3, fill=fill, outline=outline)
    label(draw, (449, 204), "201  /  19 × 409", 15, theme.muted, "mono")


def support_chart(draw, theme, accent, report):
    box = (473, 92, 579, 198)
    draw.arc(box, 0, 360, fill=theme.border, width=7)
    draw.arc(box, -90, -90 + 360 * report["test"]["macro_f1"], fill=accent, width=7)
    label(draw, (526, 143), str(report["classes"]), 38, theme.ink, "bold", "mm")
    label(draw, (526, 212), "ТЕМ ОБРАЩЕНИЙ", 14, theme.muted, "mono", "mm")


def retail_chart(draw, theme, accent, report):
    for y, caption, key, color in (
        (101, "BASELINE", "constant_baseline", theme.muted),
        (159, "CATBOOST", "catboost", accent),
    ):
        value = report["test"][key]["average_precision"]
        label(draw, (441, y), caption, 14, theme.muted, "mono")
        label(draw, (604, y), decimal(value), 14, color, "mono", "ra")
        draw.rounded_rectangle((442, y + 24, 605, y + 33), radius=4, fill=theme.border)
        draw.rounded_rectangle((442, y + 24, 442 + round(163 * value), y + 33), radius=4, fill=color)


def render_card(theme, accent, title, value, caption, stack, chart):
    art = Image.new("RGBA", (640, 281))
    draw = ImageDraw.Draw(art)
    draw.rounded_rectangle((1, 1, 638, 279), radius=22, fill=theme.surface, outline=theme.border, width=2)
    draw.rounded_rectangle((30, 27, 53, 32), radius=2, fill=accent)
    label(draw, (29, 43), title, 36, theme.ink, "bold")
    label(draw, (27, 83), value, 73, accent, "bold")
    label(draw, (31, 176), caption, 22, theme.muted)
    draw.line((30, 226, 608, 226), fill=theme.border)
    label(draw, (31, 244), stack, 15, theme.muted, "mono")
    draw.line((593, 259, 606, 246), fill=accent, width=2)
    draw.line(((598, 246), (606, 246), (606, 254)), fill=accent, width=2)
    chart(draw, theme, accent)
    return art


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, help="Use local copies of the source reports.")
    args = parser.parse_args()
    inputs = read_inputs(args.data_dir)
    edge = json.loads(inputs["edge.json"])
    support = json.loads(inputs["support.json"])
    retail = json.loads(inputs["retail.json"])
    clusters = network_layout(inputs["schedule.csv"])
    if sum(len(nodes) for _, _, nodes in clusters) != edge["device_count"]:
        raise ValueError("The saved schedule and benchmark have different device counts.")

    rollouts = edge["summary"]["rollouts"]
    gain = 100 * (rollouts["bandwidth"]["mean_utility"] / rollouts["fifo"]["mean_utility"] - 1)
    cards = (
        ("edge", "Edge Rollout Lab", f"+{gain:.1f}%".replace(".", ","), "полезность относительно FIFO",
         "PYTHON / SCIKIT-LEARN", lambda draw, theme, color: edge_chart(draw, theme, color, edge)),
        ("slotguard", "SlotGuard", "1 / 20", "бронь при гонке за слот",
         ".NET / POSTGRESQL / TESTCONTAINERS", slot_chart),
        ("support", "Support Intent Classifier", decimal(support["test"]["macro_f1"]), "macro-F1 на BANKING77",
         "FASTAPI / TF-IDF / LINEARSVC", lambda draw, theme, color: support_chart(draw, theme, color, support)),
        ("retail", "Repeat Purchase ML", decimal(retail["test"]["catboost"]["average_precision"]),
         "Average Precision на тесте", "SQL / CATBOOST / FASTAPI",
         lambda draw, theme, color: retail_chart(draw, theme, color, retail)),
    )

    ASSETS.mkdir(parents=True, exist_ok=True)
    for name, theme in THEMES.items():
        render_masthead(name, theme, clusters, edge["device_count"])
        for accent, (key, *card) in zip(theme.accents, cards):
            render_card(theme, accent, *card).save(ASSETS / f"{key}-{name}.png", optimize=True)


if __name__ == "__main__":
    main()
