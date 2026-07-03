import pandas as pd
from itertools import islice
from youtube_comment_downloader import YoutubeCommentDownloader, SORT_BY_RECENT

URL = "https://www.youtube.com/shorts/n4pPsZQ-sVM"
MAX_COMMENTS = 500
OUTPUT_CSV = "komentar_youtube.csv"

downloader = YoutubeCommentDownloader()

comments = downloader.get_comments_from_url(
    URL,
    sort_by=SORT_BY_RECENT
)

rows = []

for comment in islice(comments, MAX_COMMENTS):
    text = comment.get("text", "").strip()

    if text:
        rows.append({
            "komentar": text
        })

df = pd.DataFrame(rows)
df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

print(f"Selesai. Berhasil menyimpan {len(df)} komentar ke {OUTPUT_CSV}")