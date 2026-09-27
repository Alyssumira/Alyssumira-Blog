/* mistwood 内容数据：新增内容 = 在对应数组末尾加一个对象，页面与数字全自动
   - essays：有 excerpt 渲染为 B 横条卡，无 excerpt 渲染为 C 纯文字卡
   - slug 对应 posts/<slug>.md（详情页按 ?p=slug 加载）
   - cover / shot：留空 = 占位封面；填入 assets/ 下的图片路径即用真图
*/
var CONTENT = {
  essays: [
    {
      slug: 'forest-blog',
      title: '把博客当作一座森林来打理',
      date: '2026.09.20',
      excerpt: '写作不是输出，是巡逻。每隔几天走一圈，看看哪些想法发了芽，哪些需要修剪。',
      cover: ''
    },
    {
      slug: 'fog-debugging',
      title: '雾天调试法',
      date: '2026.09.12',
      excerpt: '看不清全局的时候，就先看清脚下的一米。日志是灯，断点是路标。',
      cover: ''
    },
    {
      slug: 'slow-frontend',
      title: '慢一点的前端',
      date: '2026.09.05',
      excerpt: '',
      cover: ''
    }
  ],
  things: [
    { name: '白噪声收音机', tag: 'web · toy',   link: '#', shot: '' },
    { name: '番茄钟 · 苔',  tag: 'pwa',         link: '#', shot: '' },
    { name: '书签森林',     tag: 'self-hosted', link: '#', shot: '' },
    { name: '像素天气',     tag: 'api · toy',   link: '#', shot: '' }
  ],
  notes: [
    { date: '2026.09.25', weather: 'light rain', text: '雨后的人行道反着光，走路像在翻一本没裁开的书。' },
    { date: '2026.09.21', weather: 'fog',        text: '今天把网站的雾灯做出来了。光标照到哪里，哪里的雾就散开——原来*清晰*也是可以被提着走的。' },
    { date: '2026.09.18', weather: 'light',      text: '楼下的桂花开了半树。另一半大概是想清楚了再开。' }
  ]
};
