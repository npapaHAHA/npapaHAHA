from github import Github
import os

token = os.getenv("GH_TOKEN")
g = Github(token)
user = g.get_user()

repos = user.get_repos()
lang_stats = {}
total_commits = 0

for repo in repos:
    if repo.fork:
        continue
    try:
        total_commits += repo.get_commits().totalCount
        for lang, size in repo.get_languages().items():
            lang_stats[lang] = lang_stats.get(lang, 0) + size
    except Exception:
        pass

md_block = f"""
## 📊 GitHub Статистика (автообновление)

**Всего коммитов**: {total_commits}

**Топ языков:**
"""
for lang, size in sorted(lang_stats.items(), key=lambda x: x[1], reverse=True)[:5]:
    md_block += f"\n- {lang}: {size} байт"

with open("README.md", "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "<!--STATS_START-->"
end_marker = "<!--STATS_END-->"
before = content.split(start_marker)[0]
after = content.split(end_marker)[-1]

new_content = f"{before}{start_marker}\n{md_block}\n{end_marker}{after}"

with open("README.md", "w", encoding="utf-8") as f:
    f.write(new_content)
