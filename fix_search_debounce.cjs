const fs = require('fs');

let content = fs.readFileSync('src/features/chat/components/MainChat.tsx', 'utf8');

const target = `      .catch(() => {
        if (isSubscribed) setBackendMatchedIds([]);
      });

    return () => {`;

const replacement = `      .catch(() => {
        if (isSubscribed) setBackendMatchedIds([]);
      });
    }, 400);

    return () => {
      clearTimeout(timer);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/features/chat/components/MainChat.tsx', content);
console.log("Updated search debounce properly");
