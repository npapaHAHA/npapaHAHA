"""Generate the scene's replays with an existing checkout of Edge Rollout Lab."""

import argparse
from dataclasses import replace
from itertools import accumulate
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
BANDWIDTH_LIMITS = (70, 115, 170)
STRATEGIES = ("fifo", "gain", "bandwidth")


def summarize_days(fleet, actions, score):
    devices = {device.id: device for device in fleet.devices}
    releases = {release.id: release for release in fleet.releases}
    schedules = [[] for _ in range(fleet.days)]
    for action in actions:
        schedules[action.day].append(action)

    installed = {site: 0 for site in fleet.site_mb}
    seen = set()
    traffic = 0
    days = [{"sites": list(installed.values()), "devices": 0, "traffic": 0, "dailyTraffic": 0, "utility": 0}]

    for transfers, utility in zip(schedules, accumulate(score.daily_utility), strict=True):
        transferred = 0
        for action in transfers:
            transferred += releases[action.release_id].size_mb
            if action.device_id not in seen:
                installed[devices[action.device_id].site] += 1
                seen.add(action.device_id)
        traffic += transferred
        days.append({
            "sites": list(installed.values()),
            "devices": len(seen),
            "traffic": traffic,
            "dailyTraffic": transferred,
            "utility": utility / 1000,
        })
    assert traffic == score.megabytes and len(seen) == score.installed_devices
    return days


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("edge_rollout_lab", type=Path)
    args = parser.parse_args()
    source = args.edge_rollout_lab.resolve(strict=True)
    sys.path.insert(0, str(source))

    from edge_rollout.experiment import make_fleet, scoring_fleet
    from edge_rollout.scheduler import plan, validate_and_score

    report = json.loads((source / "reports" / "benchmark.json").read_text(encoding="utf-8"))
    seed = report["sample_schedule_seed"]
    run = next(run for run in report["runs"] if run["seed"] == seed)
    source_fleet = make_fleet(seed, report["device_count"], report["days"], run["models"]["validation"])
    data = {
        "seed": seed,
        "dayCount": source_fleet.days,
        "deviceCount": len(source_fleet.devices),
        "sites": [
            {"id": site, "limit": limit, "devices": sum(d.site == site for d in source_fleet.devices)}
            for site, limit in source_fleet.site_mb.items()
        ],
        "plans": {},
    }

    for budget in BANDWIDTH_LIMITS:
        fleet = replace(source_fleet, global_mb=budget)
        replay = scoring_fleet(fleet, run["models"]["test"])
        results = {}
        for strategy in STRATEGIES:
            actions = plan(fleet, strategy)
            score = validate_and_score(replay, actions)
            if budget == source_fleet.global_mb:
                published = run["rollouts"][strategy]
                assert score.utility == published["utility"]
                assert score.megabytes == published["megabytes"]
                assert score.daily_utility == tuple(published["daily_utility"])
            results[strategy] = summarize_days(fleet, actions, score)
        data["plans"][budget] = results

    output = ROOT / "docs" / "data" / "replays.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(STRATEGIES) * len(BANDWIDTH_LIMITS)} validated replays, seed {seed}, {output.stat().st_size} bytes")


if __name__ == "__main__":
    main()
