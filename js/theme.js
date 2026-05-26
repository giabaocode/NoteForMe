window.ThemeManager = {
  theme: 'dark', // default
  
  async init() {
    // Load saved theme from DB, default to 'dark'
    const saved = await DB.getSetting('theme');
    this.theme = saved || 'dark';
    this.apply();
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set preference
    });
    
    // Toggle button
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => this.toggle());
  },
  
  apply() {
    const app = document.getElementById('app');
    if (this.theme === 'dark') {
      app.classList.add('dark-theme');
    } else {
      app.classList.remove('dark-theme');
    }
    // Update toggle button text/icon
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    if (icon) icon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
    if (text) text.textContent = this.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = this.theme === 'dark' ? '#06060F' : '#F8F9FD';
  },
  
  async toggle() {
    // Add transition class for smooth theme switch
    document.getElementById('app').classList.add('theme-transitioning');
    
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.apply();
    await DB.setSetting('theme', this.theme);
    
    // Remove transition class after animation
    setTimeout(() => {
      document.getElementById('app').classList.remove('theme-transitioning');
    }, 500);
  },
  
  get() { return this.theme; },
  set(theme) { this.theme = theme; this.apply(); }
};
