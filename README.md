# Growth Tracker

A personal growth tracker. Log weight, length, head size and more, and see them on the WHO and CDC growth charts with percentiles, trend lines and plain-language notes.

## Where the data lives

- This repo holds only the website. No personal data is stored here.
- Measurements are saved to a separate **private** repo (`growth-tracker-data`) as `data.json`. Every save is a commit, so the full history is kept and can be restored.
- Each phone connects once with a fine-grained access token that can only read and write that one private repo. The token stays on the phone.
- The app also keeps a copy on each device so it works offline, and it can export CSV and JSON backups.

## What it shows

- Weight, length/height, head circumference, weight for length, BMI, arm circumference and skinfolds, with WHO and CDC percentiles side by side
- Charts with percentile bands, his own line, and a projection along his current curve
- Change since the last visit compared with staying on his curve, percentile crossings, next checkup estimate, adult height outlook, size at birth for gestational age, and WHO motor milestone windows
- Corrected age for babies born before 37 weeks

## Sources

- WHO Child Growth Standards (2006) and WHO Growth Reference (2007), taken from the WHO `anthro` and `anthroplus` tables
- CDC 2000 Growth Charts with the 2022 extended BMI percentiles
- INTERGROWTH-21st Newborn Size Standards
- WHO Motor Development Study (2006)

Reference tables were thinned so that straight-line interpolation stays within 0.002 SD of the full published tables.

Libraries included: qrcode-generator (MIT) and jsQR (Apache 2.0) for the phone pairing code.

For tracking at home. It does not replace your pediatrician.
