#!/usr/bin/env sh
set -eu

mkdir -p ./secrets
chmod 700 ./secrets
for name in ip_hash_key turn_shared_secret gemini_api_key deepseek_api_key groq_api_key \
  openrouter_api_key openai_api_key tavily_api_key twilio_account_sid twilio_auth_token; do
  file="./secrets/$name"
  if [ ! -e "$file" ]; then
    (umask 077; : > "$file")
  fi
  chmod 600 "$file"
done
