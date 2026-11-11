#!/usr/bin/env bash

hosts=(nhom15s1 nhom15s2 nhom15s3 nhom15a1 nhom15a2)
timeout=2

for host in "${hosts[@]}"; do
    ip=$(getent ahostsv4 "$host" | awk 'NR == 1 { print $1; exit }')

    if [[ -z "$ip" ]]; then
        printf '%-10s %s\n' "$host" "LỖI: không tìm thấy IP (DNS/mDNS)"
    elif ping -n -c 1 -W "$timeout" "$ip" >/dev/null 2>&1; then
        printf '%-10s %s\n' "$host" "$ip"
    else
        printf '%-10s %s\n' "$host" "LỖI: không phản hồi"
    fi
done
