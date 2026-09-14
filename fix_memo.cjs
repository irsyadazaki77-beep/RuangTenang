const fs = require('fs');
let content = fs.readFileSync('src/features/chat/components/MessageBubble.tsx', 'utf8');

const target = `    </motion.div>
  );
});`;

const replacement = `    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.error === nextProps.msg.error &&
    prevProps.msg.plugin === nextProps.msg.plugin &&
    prevProps.isTyping === nextProps.isTyping &&
    prevProps.isBookmarked === nextProps.isBookmarked &&
    prevProps.isSearchTarget === nextProps.isSearchTarget &&
    prevProps.searchHighlightQuery === nextProps.searchHighlightQuery &&
    JSON.stringify(prevProps.msg.attachments) === JSON.stringify(nextProps.msg.attachments)
  );
});`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/features/chat/components/MessageBubble.tsx', content);
  console.log("Updated MessageBubble memoization");
} else {
  console.log("Could not find bottom replace target.");
}
