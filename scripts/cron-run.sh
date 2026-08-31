#!/bin/sh
# Usage: scripts/cron-run.sh <ເສັ້ນທາງ API> [ port ]
#
# ເອີ້ນເສັ້ນທາງທີ່ຕ້ອງແລ່ນຕາມຕາຕະລາງ (drain / reminders) ພ້ອມ header ລັບ
# ແລ້ວຂຽນຜົນລົງ logs/ ພ້ອມເວລາ — ໃຫ້ອ່ານຍ້ອນຫຼັງໄດ້ວ່າຮອບໃດລົ້ມ
#
# ອ່ານລະຫັດລັບຈາກ .env.local ບໍ່ໃສ່ໃນ crontab ເພື່ອບໍ່ໃຫ້ຄ່າລັບ
# ໄປປະກົດຢູ່ `crontab -l` ຫຼື ໃນ log ຂອງ cron
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

ENDPOINT=${1:?ຕ້ອງບອກເສັ້ນທາງ ເຊັ່ນ /api/notify/drain}
PORT=${2:-3010}
NAME=$(basename "$ENDPOINT")

SECRET=$(grep -m1 '^NOTIFY_DRAIN_SECRET=' .env.local | cut -d= -f2- | tr -d '"' | xargs)
if [ -z "$SECRET" ]; then
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') ບໍ່ພົບ NOTIFY_DRAIN_SECRET ໃນ .env.local" >&2
  exit 1
fi

mkdir -p logs

# ຕິດເວລາໄວ້ຕົ້ນແຖວ ແລະ ຂຶ້ນແຖວໃໝ່ທ້າຍສຸດ — ບໍ່ດັ່ງນັ້ນຄຳຕອບ JSON
# ຂອງແຕ່ລະຮອບຈະຕິດກັນເປັນແຖວດຽວຍາວ
{
  printf '%s ' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  curl -fsS --max-time 120 -X POST \
    -H "x-notify-secret: $SECRET" \
    "http://127.0.0.1:${PORT}${ENDPOINT}" || printf 'ລົ້ມເຫຼວ (curl %s)' "$?"
  printf '\n'
} >> "logs/${NAME}.log" 2>&1
