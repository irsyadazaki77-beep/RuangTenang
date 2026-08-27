const fs = require('fs');
let content = fs.readFileSync('src/features/chat/components/MainChat.tsx', 'utf-8');

content = content.replace(/const handleScroll = \(\) => \{\n\s*if \(!bottomRef\.current\) return;\n\s*if \(scrollContainerRef\.current\) \{\n\s*const \{ scrollTop, scrollHeight, clientHeight \} = scrollContainerRef\.current;\n\s*setShowScrollBottom\(scrollHeight - scrollTop - clientHeight > 100\);\n\s*\} else \{\n\s*setShowScrollBottom\(document\.documentElement\.scrollHeight - window\.scrollY - window\.innerHeight > 100\);\n\s*\}\n\s*\};/, 
`const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
  };`);

content = content.replace(/useEffect\(\(\) => \{\n\s*window\.addEventListener\('scroll', handleScroll\);\n\s*return \(\) => window\.removeEventListener\('scroll', handleScroll\);\n\s*\}, \[\]\);/,
`useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, []);`);

content = content.replace(/const scrollToBottom = \(force = false\) => \{\n\s*if \(force \|\| !showScrollBottom\) \{\n\s*window\.scrollTo\(\{ top: document\.documentElement\.scrollHeight, behavior: 'smooth' \}\);\n\s*\}\n\s*\};/,
`const scrollToBottom = (force = false) => {
    if (force || !showScrollBottom) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };`);

fs.writeFileSync('src/features/chat/components/MainChat.tsx', content);
