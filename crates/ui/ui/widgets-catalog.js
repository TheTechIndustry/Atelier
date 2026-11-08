window.WIDGET_CATEGORIES = [
  {
    "id": "ai",
    "name": "AI Limits",
    "desc": "How much of your AI plan is left, read from the tools you already use."
  },
  {
    "id": "productivity",
    "name": "Productivity",
    "desc": "Screen time, focus timers, a stopwatch, tasks, notes and your next event."
  },
  {
    "id": "dev",
    "name": "Dev Life",
    "desc": "GitHub commits, PRs, CI builds, Vercel deployments and package metrics."
  },
  {
    "id": "revenue",
    "name": "Revenue & SaaS",
    "desc": "Stripe MRR, Lemon Squeezy sales, Shopify orders and churn rates."
  },
  {
    "id": "finance",
    "name": "Crypto & Stocks",
    "desc": "Live Bitcoin, Ethereum, Solana prices and market metrics."
  },
  {
    "id": "system",
    "name": "System & Stats",
    "desc": "Live CPU, memory, GPU temperatures, disk space and network speeds."
  },
  {
    "id": "controls",
    "name": "Quick Controls",
    "desc": "One-click audio volume, microphone mute, recycle bin and system controls."
  },
  {
    "id": "utilities",
    "name": "Media & Feeds",
    "desc": "Music playback, Hacker News top stories, weather and world clocks."
  }
];

window.WIDGETS_CATALOG = [
  {
    "id": "clock",
    "name": "Clock",
    "category": "productivity",
    "desc": "Local time and date with customizable 24h & seconds",
    "iconKey": "timer",
    "defaultBg": "#20212b",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "hour_24",
        "label": "24-hour clock",
        "type": "switch",
        "default": true
      },
      {
        "key": "show_date",
        "label": "Show date",
        "type": "switch",
        "default": true
      },
      {
        "key": "show_seconds",
        "label": "Show seconds",
        "type": "switch",
        "default": false
      }
    ]
  },
  {
    "id": "calendar",
    "name": "Calendar",
    "category": "productivity",
    "desc": "Today and current month calendar grid",
    "iconKey": "calendar_badge",
    "defaultBg": "#f8f9fc",
    "defaultFg": "#202332",
    "fields": [
      {
        "key": "show_month",
        "label": "Show month grid",
        "type": "switch",
        "default": true
      },
      {
        "key": "show_weekday",
        "label": "Show weekday",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "system",
    "name": "System Monitor",
    "category": "system",
    "desc": "Live CPU, RAM, GPU, Disk and Network metrics",
    "iconKey": "cpu",
    "defaultBg": "#1f232d",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "show_cpu",
        "label": "CPU usage",
        "type": "switch",
        "default": true
      },
      {
        "key": "show_memory",
        "label": "Memory usage",
        "type": "switch",
        "default": true
      },
      {
        "key": "show_gpu",
        "label": "GPU usage",
        "type": "switch",
        "default": false
      },
      {
        "key": "show_network",
        "label": "Network traffic",
        "type": "switch",
        "default": false
      },
      {
        "key": "show_disk",
        "label": "System drive usage",
        "type": "switch",
        "default": false
      }
    ]
  },
  {
    "id": "media",
    "name": "Now Playing",
    "category": "utilities",
    "desc": "Current Windows media session (Spotify, YouTube, Music)",
    "iconKey": "music",
    "defaultBg": "#7651bb",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "show_artist",
        "label": "Show artist",
        "type": "switch",
        "default": true
      },
      {
        "key": "show_album",
        "label": "Show album",
        "type": "switch",
        "default": false
      },
      {
        "key": "show_artwork",
        "label": "Show artwork",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "battery",
    "name": "Battery",
    "category": "system",
    "desc": "Battery charge level and AC power status",
    "iconKey": "battery",
    "defaultBg": "#1f242c",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "show_status",
        "label": "Show power status",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "notes",
    "name": "Notes",
    "category": "productivity",
    "desc": "Sticky memo on your desktop with quick text",
    "iconKey": "notes_pad",
    "defaultBg": "#fff1a6",
    "defaultFg": "#202332",
    "fields": [
      {
        "key": "notes",
        "label": "Note text",
        "type": "textarea",
        "placeholder": "Write note..."
      }
    ]
  },
  {
    "id": "weather",
    "name": "Weather",
    "category": "utilities",
    "desc": "Live conditions, temperature and 7-day forecast",
    "iconKey": "weather",
    "defaultBg": "#447cb7",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "city",
        "label": "City name",
        "type": "text",
        "placeholder": "Kyiv, London..."
      },
      {
        "key": "fahrenheit",
        "label": "Fahrenheit",
        "type": "switch",
        "default": false
      },
      {
        "key": "show_forecast",
        "label": "7-day forecast",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "photo",
    "name": "Photo Frame",
    "category": "utilities",
    "desc": "Display a favorite photo, artwork, or animated GIF",
    "iconKey": "photo",
    "defaultBg": "#181920",
    "defaultFg": "#ffffff",
    "fields": []
  },
  {
    "id": "countdown",
    "name": "Countdown",
    "category": "productivity",
    "desc": "Days until a deadline, birthday, or milestone",
    "iconKey": "countdown",
    "defaultBg": "#212431",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "countdown_title",
        "label": "Event title",
        "type": "text",
        "placeholder": "Product Launch"
      },
      {
        "key": "countdown_date",
        "label": "Target date",
        "type": "date"
      }
    ]
  },
  {
    "id": "audio",
    "name": "Audio Visualizer",
    "category": "utilities",
    "desc": "Real-time responsive spectrum analyzer of desktop audio",
    "iconKey": "volume",
    "defaultBg": "#20212b",
    "defaultFg": "#ffffff",
    "fields": []
  },
  {
    "id": "ai_claude",
    "name": "Claude Usage",
    "category": "ai",
    "desc": "Your Claude session limit and when it resets",
    "iconKey": "claude_asterisk",
    "template": "ai_usage",
    "title": "Session",
    "meta": "1h 25m",
    "value": "100%",
    "pct": 100,
    "accent": "#22c55e",
    "fields": [
      {
        "key": "api_key",
        "label": "Anthropic API Key",
        "type": "password",
        "placeholder": "sk-ant-api03-..."
      },
      {
        "key": "model",
        "label": "Model",
        "type": "select",
        "options": [
          "claude-3-5-sonnet-latest",
          "claude-3-opus-latest",
          "claude-3-5-haiku-latest"
        ],
        "default": "claude-3-5-sonnet-latest"
      },
      {
        "key": "session_limit",
        "label": "Session Quota",
        "type": "number",
        "default": 100
      }
    ]
  },
  {
    "id": "ai_claude_plan",
    "name": "Claude Plan Usage",
    "category": "ai",
    "desc": "Session and weekly Claude limits, plus your most-used model",
    "iconKey": "claude_asterisk",
    "template": "ai_plan",
    "rows": [
      {
        "label": "Session",
        "time": "1h 25m",
        "pct": 100
      },
      {
        "label": "Weekly",
        "time": "6 Tue",
        "pct": 37
      }
    ],
    "footer": "Opus 3.5 · most used 31.0M",
    "fields": [
      {
        "key": "api_key",
        "label": "Anthropic API Key",
        "type": "password",
        "placeholder": "sk-ant-api03-..."
      },
      {
        "key": "model",
        "label": "Model",
        "type": "select",
        "options": [
          "claude-3-5-sonnet-latest",
          "claude-3-opus-latest"
        ],
        "default": "claude-3-5-sonnet-latest"
      },
      {
        "key": "weekly_limit",
        "label": "Weekly Limit",
        "type": "number",
        "default": 250
      }
    ]
  },
  {
    "id": "ai_chatgpt",
    "name": "ChatGPT Usage",
    "category": "ai",
    "desc": "Your ChatGPT plan's Codex limits: the 5-hour and weekly windows",
    "iconKey": "chatgpt",
    "template": "ai_plan",
    "rows": [
      {
        "label": "Session",
        "time": "2h 12m",
        "pct": 34
      },
      {
        "label": "Weekly",
        "time": "Thu 15",
        "pct": 21
      }
    ],
    "fields": [
      {
        "key": "api_key",
        "label": "OpenAI API Key",
        "type": "password",
        "placeholder": "sk-proj-..."
      },
      {
        "key": "model",
        "label": "Model",
        "type": "select",
        "options": [
          "gpt-4o",
          "gpt-4o-mini",
          "o1-preview",
          "o1-mini"
        ],
        "default": "gpt-4o"
      },
      {
        "key": "quota_limit",
        "label": "Monthly Allowance ($)",
        "type": "number",
        "default": 50
      }
    ]
  },
  {
    "id": "ai_gemini",
    "name": "Gemini Usage",
    "category": "ai",
    "desc": "Gemini 5h & Weekly quota limits and models",
    "iconKey": "gemini",
    "template": "ai_plan",
    "rows": [
      {
        "label": "5h limit",
        "time": "4h 34m",
        "pct": 96
      },
      {
        "label": "Weekly limit",
        "time": "15h 32m",
        "pct": 47
      }
    ],
    "fields": [
      {
        "key": "api_key",
        "label": "Gemini API Key",
        "type": "password",
        "placeholder": "AIzaSy..."
      },
      {
        "key": "five_hour_pct",
        "label": "5h Limit (% left)",
        "type": "number",
        "default": 59
      },
      {
        "key": "five_hour_reset",
        "label": "5h Reset time",
        "type": "text",
        "default": "15m"
      },
      {
        "key": "weekly_pct",
        "label": "Weekly Limit (% left)",
        "type": "number",
        "default": 49
      },
      {
        "key": "weekly_reset",
        "label": "Weekly Reset time",
        "type": "text",
        "default": "16h 13m"
      }
    ]
  },
  {
    "id": "ai_grok",
    "name": "Grok Usage",
    "category": "ai",
    "desc": "SuperGrok credit use, from your own sign-in",
    "iconKey": "grok",
    "template": "ai_single_bar",
    "title": "Credits",
    "meta": "Fri 30",
    "pct": 28,
    "accent": "#22c55e",
    "fields": [
      {
        "key": "api_key",
        "label": "xAI Grok API Key",
        "type": "password",
        "placeholder": "xai-..."
      }
    ]
  },
  {
    "id": "ai_deepseek",
    "name": "DeepSeek Balance",
    "category": "ai",
    "desc": "Your DeepSeek balance, with today's and this week's spend",
    "iconKey": "deepseek",
    "template": "key_value_list",
    "items": [
      {
        "label": "Balance",
        "value": "$18.42"
      },
      {
        "label": "Today",
        "value": "$0.36"
      },
      {
        "label": "7 days",
        "value": "$2.91"
      }
    ],
    "fields": [
      {
        "key": "api_key",
        "label": "DeepSeek API Key",
        "type": "password",
        "placeholder": "sk-..."
      }
    ]
  },
  {
    "id": "ai_glm",
    "name": "GLM Usage",
    "category": "ai",
    "desc": "Z.ai / Zhipu GLM Coding Plan limits",
    "iconKey": "glm",
    "template": "ai_plan",
    "rows": [
      {
        "label": "Session",
        "time": "2h 54m",
        "pct": 41
      },
      {
        "label": "Weekly",
        "time": "Fri 16",
        "pct": 12
      },
      {
        "label": "MCP",
        "time": "Sat 31",
        "pct": 9
      }
    ],
    "fields": [
      {
        "key": "api_key",
        "label": "Zhipu GLM API Key",
        "type": "password",
        "placeholder": "API key"
      }
    ]
  },
  {
    "id": "ai_opencode",
    "name": "OpenCode Usage",
    "category": "ai",
    "desc": "OpenCode usage for the current session, from its local history",
    "iconKey": "opencode",
    "template": "ai_stat",
    "title": "Session",
    "meta": "last 5h",
    "value": "182.4K",
    "fields": [
      {
        "key": "session_tokens_limit",
        "label": "Token limit",
        "type": "number",
        "default": 200000
      }
    ]
  },
  {
    "id": "ai_perplexity",
    "name": "Perplexity Pro",
    "category": "ai",
    "desc": "Daily Pro search queries remaining and model quota",
    "iconKey": "perplexity",
    "template": "ai_usage",
    "title": "Pro Searches",
    "meta": "Renews 00:00",
    "value": "264 / 300",
    "pct": 88,
    "accent": "#20b2aa",
    "fields": [
      {
        "key": "api_key",
        "label": "Perplexity API Key",
        "type": "password",
        "placeholder": "pplx-..."
      }
    ]
  },
  {
    "id": "ai_cursor",
    "name": "Cursor Composer",
    "category": "ai",
    "desc": "Cursor fast request credits and premium model usage",
    "iconKey": "cursor",
    "template": "ai_single_bar",
    "title": "Fast Credits",
    "meta": "412 / 500",
    "pct": 82,
    "accent": "#a855f7",
    "fields": [
      {
        "key": "session_token",
        "label": "Cursor Token",
        "type": "password",
        "placeholder": "WorkosCursorSessionToken"
      },
      {
        "key": "fast_credits",
        "label": "Monthly Fast Credits",
        "type": "number",
        "default": 500
      }
    ]
  },
  {
    "id": "ai_copilot",
    "name": "GitHub Copilot",
    "category": "ai",
    "desc": "Copilot completions accepted and monthly chat queries",
    "iconKey": "copilot",
    "template": "ai_usage",
    "title": "Chat Usage",
    "meta": "186 accepted",
    "value": "48 / 60",
    "pct": 80,
    "accent": "#6e40c9",
    "fields": [
      {
        "key": "token",
        "label": "GitHub PAT",
        "type": "password",
        "placeholder": "ghp_..."
      }
    ]
  },
  {
    "id": "ai_ollama",
    "name": "Ollama Local LLM",
    "category": "ai",
    "desc": "Active local model, VRAM consumption and generation speed",
    "iconKey": "ollama",
    "template": "key_value_list",
    "items": [
      {
        "label": "Model",
        "value": "llama3.2:3b"
      },
      {
        "label": "Speed",
        "value": "42.4 t/s"
      },
      {
        "label": "VRAM",
        "value": "3.8 GB"
      }
    ],
    "fields": [
      {
        "key": "host",
        "label": "Ollama Host",
        "type": "text",
        "placeholder": "http://localhost:11434",
        "default": "http://localhost:11434"
      },
      {
        "key": "model",
        "label": "Model",
        "type": "text",
        "placeholder": "llama3.2",
        "default": "llama3.2"
      }
    ]
  },
  {
    "id": "dev_github_contrib",
    "name": "GitHub Commits",
    "category": "dev",
    "desc": "Recent contribution squares and daily commit count",
    "iconKey": "github",
    "template": "dev_stat",
    "title": "GitHub",
    "meta": "542 year-to-date",
    "value": "14 today",
    "accent": "#39d353",
    "fields": [
      {
        "key": "username",
        "label": "GitHub Username",
        "type": "text",
        "placeholder": "e.g. torvalds",
        "default": "torvalds"
      },
      {
        "key": "token",
        "label": "GitHub PAT (optional)",
        "type": "password",
        "placeholder": "ghp_..."
      }
    ]
  },
  {
    "id": "dev_github_prs",
    "name": "GitHub PRs",
    "category": "dev",
    "desc": "Open pull requests requiring your review or waiting merge",
    "iconKey": "github",
    "template": "key_value_list",
    "items": [
      {
        "label": "Open PRs",
        "value": "3 open"
      },
      {
        "label": "Review req.",
        "value": "2 pending"
      },
      {
        "label": "Ready merge",
        "value": "#412"
      }
    ],
    "fields": [
      {
        "key": "username",
        "label": "GitHub Username",
        "type": "text",
        "placeholder": "e.g. torvalds"
      },
      {
        "key": "token",
        "label": "GitHub PAT (optional)",
        "type": "password",
        "placeholder": "ghp_..."
      }
    ]
  },
  {
    "id": "dev_github_issues",
    "name": "GitHub Issues",
    "category": "dev",
    "desc": "Assigned issues and bug tracker priorities",
    "iconKey": "github",
    "template": "key_value_list",
    "items": [
      {
        "label": "Assigned",
        "value": "5 active"
      },
      {
        "label": "Urgent",
        "value": "1 priority"
      },
      {
        "label": "Closed wk",
        "value": "3 solved"
      }
    ],
    "fields": [
      {
        "key": "username",
        "label": "GitHub Username",
        "type": "text",
        "placeholder": "e.g. torvalds"
      },
      {
        "key": "token",
        "label": "GitHub PAT (optional)",
        "type": "password",
        "placeholder": "ghp_..."
      }
    ]
  },
  {
    "id": "dev_github_stars",
    "name": "Repo Stars",
    "category": "dev",
    "desc": "Live star count for a public GitHub repository",
    "fields": [
      {
        "key": "repository",
        "label": "Repository (owner/repo)",
        "type": "text",
        "placeholder": "rust-lang/rust",
        "default": "rust-lang/rust"
      },
      {
        "key": "token",
        "label": "GitHub PAT (optional)",
        "type": "password",
        "placeholder": "ghp_..."
      }
    ],
    "iconKey": "github",
    "template": "dev_stat",
    "title": "Repository",
    "meta": "+38 this week",
    "value": "1,420 stars",
    "accent": "#e3b341"
  },
  {
    "id": "dev_github_notif",
    "name": "GitHub Notifications",
    "category": "dev",
    "desc": "Unread mentions, thread notifications and releases",
    "iconKey": "github",
    "template": "dev_stat",
    "title": "Notifications",
    "meta": "2 direct mentions",
    "value": "7 unread",
    "accent": "#2f81f7",
    "fields": [
      {
        "key": "token",
        "label": "GitHub PAT (notifications scope)",
        "type": "password",
        "placeholder": "ghp_..."
      }
    ]
  },
  {
    "id": "dev_gitlab_ci",
    "name": "GitLab Pipeline",
    "category": "dev",
    "desc": "Latest branch CI/CD pipeline build status & duration",
    "iconKey": "gitlab",
    "template": "dev_stat",
    "title": "Pipeline",
    "meta": "Commit 8f3a9e",
    "value": "Passed in 3m 14s",
    "accent": "#fc6d26",
    "fields": [
      {
        "key": "project_id",
        "label": "Project ID",
        "type": "text",
        "placeholder": "e.g. 278964"
      },
      {
        "key": "token",
        "label": "Private Token",
        "type": "password",
        "placeholder": "glpat-..."
      },
      {
        "key": "host",
        "label": "GitLab Host",
        "type": "text",
        "placeholder": "gitlab.com",
        "default": "gitlab.com"
      }
    ]
  },
  {
    "id": "dev_leetcode",
    "name": "LeetCode Daily",
    "category": "dev",
    "desc": "Daily problem streak and total solved breakdown",
    "iconKey": "leetcode",
    "template": "key_value_list",
    "items": [
      {
        "label": "Streak",
        "value": "28 days"
      },
      {
        "label": "Total Solved",
        "value": "342"
      },
      {
        "label": "Today",
        "value": "Completed"
      }
    ],
    "fields": [
      {
        "key": "username",
        "label": "LeetCode Username",
        "type": "text",
        "placeholder": "e.g. tourist",
        "default": "tourist"
      }
    ]
  },
  {
    "id": "dev_wakatime",
    "name": "WakaTime Coding",
    "category": "dev",
    "desc": "Daily coding duration and top active programming language",
    "iconKey": "generic",
    "template": "key_value_list",
    "items": [
      {
        "label": "Today",
        "value": "4h 32m"
      },
      {
        "label": "Rust",
        "value": "68%"
      },
      {
        "label": "TypeScript",
        "value": "24%"
      }
    ],
    "fields": [
      {
        "key": "api_key",
        "label": "WakaTime Secret API Key",
        "type": "password",
        "placeholder": "waka_..."
      }
    ]
  },
  {
    "id": "dev_npm_downloads",
    "name": "NPM Downloads",
    "category": "dev",
    "desc": "Live weekly downloads for an npm package",
    "fields": [
      {
        "key": "package",
        "label": "NPM Package Name",
        "type": "text",
        "placeholder": "e.g. react",
        "default": "react"
      }
    ],
    "iconKey": "npm",
    "template": "dev_stat",
    "title": "npm stats",
    "meta": "+12% from last week",
    "value": "48.2K / wk",
    "accent": "#cb3837"
  },
  {
    "id": "dev_crates_downloads",
    "name": "Crates.io Stats",
    "category": "dev",
    "desc": "Rust crates download metrics and new versions",
    "iconKey": "crates",
    "template": "dev_stat",
    "title": "crates.io",
    "meta": "v0.2.4 released",
    "value": "186.4K",
    "accent": "#f97316",
    "fields": [
      {
        "key": "crate",
        "label": "Crate Name",
        "type": "text",
        "placeholder": "e.g. serde",
        "default": "serde"
      }
    ]
  },
  {
    "id": "dev_pypi_downloads",
    "name": "PyPI Downloads",
    "category": "dev",
    "desc": "Python package download trends and monthly volume",
    "iconKey": "generic",
    "template": "dev_stat",
    "title": "PyPI Installs",
    "meta": "+8% this month",
    "value": "94.1K / mo",
    "accent": "#3776ab",
    "fields": [
      {
        "key": "package",
        "label": "PyPI Package Name",
        "type": "text",
        "placeholder": "e.g. torch",
        "default": "torch"
      }
    ]
  },
  {
    "id": "dev_docker",
    "name": "Docker Containers",
    "category": "dev",
    "desc": "Active container status, CPU usage and memory footprint",
    "iconKey": "docker",
    "template": "key_value_list",
    "items": [
      {
        "label": "Running",
        "value": "6 containers"
      },
      {
        "label": "Exited",
        "value": "0 errors"
      },
      {
        "label": "Memory",
        "value": "1.4 GB"
      }
    ],
    "fields": [
      {
        "key": "username",
        "label": "Docker Hub Username",
        "type": "text",
        "placeholder": "e.g. library",
        "default": "library"
      }
    ]
  },
  {
    "id": "dev_vercel",
    "name": "Vercel Deployments",
    "category": "dev",
    "desc": "Production deployment status, build log time and domain",
    "iconKey": "vercel",
    "template": "dev_stat",
    "title": "Production",
    "meta": "atelier.app (42s build)",
    "value": "Ready in 18m",
    "accent": "#ffffff",
    "fields": [
      {
        "key": "token",
        "label": "Vercel Token",
        "type": "password",
        "placeholder": "Bearer token"
      },
      {
        "key": "project_id",
        "label": "Project ID / Name",
        "type": "text",
        "placeholder": "prj_..."
      }
    ]
  },
  {
    "id": "dev_stackoverflow",
    "name": "Stack Overflow",
    "category": "dev",
    "desc": "Developer reputation, upvotes and answer badges",
    "iconKey": "stackoverflow",
    "template": "dev_stat",
    "title": "Reputation",
    "meta": "+45 points today",
    "value": "14,890",
    "accent": "#f48024",
    "fields": [
      {
        "key": "user_id",
        "label": "StackOverflow User ID",
        "type": "text",
        "placeholder": "e.g. 22656",
        "default": "22656"
      }
    ]
  },
  {
    "id": "rev_stripe_mrr",
    "name": "Stripe MRR",
    "category": "revenue",
    "desc": "Monthly Recurring Revenue and net churn rate",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Stripe MRR",
    "meta": "+18.4% MoM",
    "value": "$12,450",
    "sub": "184 active subscribers",
    "accent": "#635bff",
    "fields": [
      {
        "key": "api_key",
        "label": "Stripe Secret Key (rk_live.../sk_live...)",
        "type": "password",
        "placeholder": "rk_live_..."
      }
    ]
  },
  {
    "id": "rev_stripe_today",
    "name": "Stripe Today",
    "category": "revenue",
    "desc": "Gross revenue and successful charges collected today",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Today Revenue",
    "meta": "8 charges",
    "value": "$680.00",
    "sub": "Avg charge $85",
    "accent": "#635bff",
    "fields": [
      {
        "key": "api_key",
        "label": "Stripe Secret Key (rk_live.../sk_live...)",
        "type": "password",
        "placeholder": "rk_live_..."
      }
    ]
  },
  {
    "id": "rev_stripe_net",
    "name": "Stripe Net Volume",
    "category": "revenue",
    "desc": "Current month net volume after refunds and fees",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Net Volume",
    "meta": "Next payout $4,200",
    "value": "$34,120",
    "sub": "Current billing period",
    "accent": "#635bff",
    "fields": [
      {
        "key": "api_key",
        "label": "Stripe Secret Key (rk_live.../sk_live...)",
        "type": "password",
        "placeholder": "rk_live_..."
      }
    ]
  },
  {
    "id": "rev_polar",
    "name": "Polar.sh Revenue",
    "category": "revenue",
    "desc": "Open-source sponsorships, bounties and funding",
    "iconKey": "polar",
    "template": "revenue_stat",
    "title": "Polar Funding",
    "meta": "34 backers",
    "value": "$1,840 / mo",
    "sub": "2 active bounties",
    "accent": "#0062ff",
    "fields": [
      {
        "key": "access_token",
        "label": "Polar Token",
        "type": "password",
        "placeholder": "polar_oat_..."
      },
      {
        "key": "organization",
        "label": "Organization Slug",
        "type": "text",
        "placeholder": "e.g. my-org"
      }
    ]
  },
  {
    "id": "rev_lemonsqueezy",
    "name": "Lemon Squeezy",
    "category": "revenue",
    "desc": "Digital product sales, tax calculation and payouts",
    "iconKey": "lemonsqueezy",
    "template": "revenue_stat",
    "title": "Lemon Squeezy",
    "meta": "142 orders",
    "value": "$3,920",
    "sub": "Pending payout $1,150",
    "accent": "#ffc233",
    "fields": [
      {
        "key": "api_key",
        "label": "Lemon Squeezy API Key",
        "type": "password",
        "placeholder": "API key"
      },
      {
        "key": "store_id",
        "label": "Store ID",
        "type": "text",
        "placeholder": "e.g. 12345"
      }
    ]
  },
  {
    "id": "rev_dodo",
    "name": "Dodo Payments",
    "category": "revenue",
    "desc": "Global checkout conversions and multi-currency volume",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Dodo Sales",
    "meta": "3.8% conv.",
    "value": "$4,150",
    "sub": "Global checkout",
    "accent": "#ff4d6d",
    "fields": [
      {
        "key": "api_key",
        "label": "Dodo Payments Key",
        "type": "password",
        "placeholder": "API key"
      }
    ]
  },
  {
    "id": "rev_datafast",
    "name": "DataFast Live",
    "category": "revenue",
    "desc": "Real-time live visitor pulse and top referral sources",
    "iconKey": "datafast",
    "template": "revenue_stat",
    "title": "Live Visitors",
    "meta": "1.2K visits today",
    "value": "42 online",
    "sub": "Top: X / Twitter (44%)",
    "accent": "#0ea5e9",
    "fields": [
      {
        "key": "api_key",
        "label": "DataFast API Key",
        "type": "password",
        "placeholder": "API key"
      },
      {
        "key": "project_id",
        "label": "Project ID",
        "type": "text",
        "placeholder": "prj_..."
      }
    ]
  },
  {
    "id": "rev_google_analytics",
    "name": "Google Analytics",
    "category": "revenue",
    "desc": "Real-time GA4 active users and pageview rate",
    "iconKey": "googleanalytics",
    "template": "revenue_stat",
    "title": "GA4 Realtime",
    "meta": "Top: /pricing",
    "value": "86 active",
    "sub": "Active in past 30 min",
    "accent": "#f59e0b",
    "fields": [
      {
        "key": "property_id",
        "label": "GA4 Property ID",
        "type": "text",
        "placeholder": "e.g. 123456789"
      },
      {
        "key": "api_secret",
        "label": "API Secret",
        "type": "password",
        "placeholder": "Secret"
      }
    ]
  },
  {
    "id": "rev_shopify",
    "name": "Shopify Store",
    "category": "revenue",
    "desc": "Today e-commerce orders, fulfilled status and cart size",
    "iconKey": "shopify",
    "template": "revenue_stat",
    "title": "Shopify Sales",
    "meta": "24 orders",
    "value": "$1,480.00",
    "sub": "Avg cart $61.60",
    "accent": "#96bf48",
    "fields": [
      {
        "key": "shop_domain",
        "label": "Shop Domain",
        "type": "text",
        "placeholder": "my-store.myshopify.com"
      },
      {
        "key": "access_token",
        "label": "Admin Access Token",
        "type": "password",
        "placeholder": "shpat_..."
      }
    ]
  },
  {
    "id": "rev_paddle",
    "name": "Paddle Billing",
    "category": "revenue",
    "desc": "B2B subscription tiers, renewals and active seats",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Paddle ARR",
    "meta": "+12 new seats",
    "value": "$88,400",
    "sub": "B2B enterprise tier",
    "accent": "#00cca3",
    "fields": [
      {
        "key": "api_key",
        "label": "Paddle API Key",
        "type": "password",
        "placeholder": "API key"
      },
      {
        "key": "vendor_id",
        "label": "Vendor ID",
        "type": "text",
        "placeholder": "e.g. 12345"
      }
    ]
  },
  {
    "id": "rev_appstore",
    "name": "App Store Stats",
    "category": "revenue",
    "desc": "iOS app units downloaded, rating and in-app revenue",
    "iconKey": "apple",
    "template": "revenue_stat",
    "title": "App Store iOS",
    "meta": "4.8 rating",
    "value": "418 downloads",
    "sub": "$890 IAP today",
    "accent": "#0071e3",
    "fields": [
      {
        "key": "issuer_id",
        "label": "App Store Issuer ID",
        "type": "text",
        "placeholder": "UUID"
      },
      {
        "key": "key_id",
        "label": "Key ID",
        "type": "text",
        "placeholder": "Key ID"
      }
    ]
  },
  {
    "id": "rev_playstore",
    "name": "Google Play",
    "category": "revenue",
    "desc": "Android installs, active devices and crash rate",
    "iconKey": "generic",
    "template": "revenue_stat",
    "title": "Google Play",
    "meta": "99.8% crash-free",
    "value": "1.2K installs",
    "sub": "4.7 rating (820 rev.)",
    "accent": "#00875a",
    "fields": [
      {
        "key": "package_name",
        "label": "Package Name",
        "type": "text",
        "placeholder": "com.example.app"
      }
    ]
  },
  {
    "id": "fin_btc",
    "name": "Bitcoin (BTC)",
    "category": "finance",
    "desc": "Real-time BTC/USD spot price and 24h percentage change",
    "iconKey": "btc",
    "template": "crypto",
    "symbol": "BTC / USD",
    "value": "$89,450",
    "change": "+4.2% 24h",
    "sub": "High $90,120",
    "fields": [
      {
        "key": "currency",
        "label": "Currency",
        "type": "select",
        "options": [
          "USD",
          "EUR",
          "UAH",
          "GBP"
        ],
        "default": "USD"
      }
    ]
  },
  {
    "id": "fin_eth",
    "name": "Ethereum (ETH)",
    "category": "finance",
    "desc": "ETH/USD market price and current Ethereum gas fee",
    "iconKey": "eth",
    "template": "crypto",
    "symbol": "ETH / USD",
    "value": "$3,180.50",
    "change": "+2.8% 24h",
    "sub": "Gas: 14 Gwei",
    "fields": [
      {
        "key": "currency",
        "label": "Currency",
        "type": "select",
        "options": [
          "USD",
          "EUR",
          "UAH",
          "GBP"
        ],
        "default": "USD"
      }
    ]
  },
  {
    "id": "fin_sol",
    "name": "Solana (SOL)",
    "category": "finance",
    "desc": "SOL/USD quote and network transactions per second",
    "iconKey": "sol",
    "template": "crypto",
    "symbol": "SOL / USD",
    "value": "$184.20",
    "change": "+6.1% 24h",
    "sub": "TPS: 2,840 tx/s",
    "fields": [
      {
        "key": "currency",
        "label": "Currency",
        "type": "select",
        "options": [
          "USD",
          "EUR",
          "UAH",
          "GBP"
        ],
        "default": "USD"
      }
    ]
  },
  {
    "id": "fin_crypto_list",
    "name": "Crypto Watchlist",
    "category": "finance",
    "desc": "Glanceable mini-table of BTC, ETH, and SOL",
    "iconKey": "btc",
    "template": "key_value_list",
    "items": [
      {
        "label": "BTC",
        "value": "$89,450 (+4.2%)"
      },
      {
        "label": "ETH",
        "value": "$3,180 (+2.8%)"
      },
      {
        "label": "SOL",
        "value": "$184.20 (+6.1%)"
      }
    ],
    "fields": [
      {
        "key": "currency",
        "label": "Currency",
        "type": "select",
        "options": [
          "USD",
          "EUR",
          "UAH",
          "GBP"
        ],
        "default": "USD"
      }
    ]
  },
  {
    "id": "fin_sp500",
    "name": "S&P 500 Index",
    "category": "finance",
    "desc": "Leading 500 US companies index performance",
    "iconKey": "stocks",
    "template": "crypto",
    "symbol": "S&P 500 (SPX)",
    "value": "5,880.40",
    "change": "+0.41%",
    "sub": "Market Open",
    "fields": [
      {
        "key": "symbol",
        "label": "Index Symbol",
        "type": "text",
        "default": "^GSPC"
      }
    ]
  },
  {
    "id": "fin_nasdaq",
    "name": "NASDAQ 100",
    "category": "finance",
    "desc": "Technology-heavy composite index quotes",
    "iconKey": "stocks",
    "template": "crypto",
    "symbol": "NASDAQ 100",
    "value": "20,410.20",
    "change": "+0.70%",
    "sub": "Tech momentum",
    "fields": [
      {
        "key": "symbol",
        "label": "Index Symbol",
        "type": "text",
        "default": "^IXIC"
      }
    ]
  },
  {
    "id": "fin_stock_aapl",
    "name": "Apple (AAPL)",
    "category": "finance",
    "desc": "Apple Inc. stock price and daily trading range",
    "iconKey": "apple",
    "template": "crypto",
    "symbol": "Apple Inc.",
    "value": "$224.80",
    "change": "+0.51%",
    "sub": "Cap $3.42T",
    "fields": [
      {
        "key": "symbol",
        "label": "Stock Symbol",
        "type": "text",
        "default": "AAPL"
      }
    ]
  },
  {
    "id": "fin_stock_nvda",
    "name": "NVIDIA (NVDA)",
    "category": "finance",
    "desc": "NVIDIA Corp equity price and chip sector momentum",
    "iconKey": "stocks",
    "template": "crypto",
    "symbol": "NVIDIA (NVDA)",
    "value": "$138.40",
    "change": "+3.13%",
    "sub": "Vol 42M shares",
    "fields": [
      {
        "key": "symbol",
        "label": "Stock Symbol",
        "type": "text",
        "default": "NVDA"
      }
    ]
  },
  {
    "id": "fin_stock_tsla",
    "name": "Tesla (TSLA)",
    "category": "finance",
    "desc": "Tesla Inc. stock quote and electric vehicle index",
    "iconKey": "stocks",
    "template": "crypto",
    "symbol": "Tesla (TSLA)",
    "value": "$248.90",
    "change": "-0.84%",
    "sub": "52w High $271.00",
    "fields": [
      {
        "key": "symbol",
        "label": "Stock Symbol",
        "type": "text",
        "default": "TSLA"
      }
    ]
  },
  {
    "id": "fin_forex_usdeur",
    "name": "USD / EUR",
    "category": "finance",
    "desc": "US Dollar to Euro foreign exchange spot conversion",
    "iconKey": "currency",
    "template": "currency",
    "amount": "100",
    "converted": "92.40",
    "from": "USD",
    "to": "EUR",
    "fields": [
      {
        "key": "amount",
        "label": "Amount (USD)",
        "type": "number",
        "default": 100
      }
    ]
  },
  {
    "id": "fin_forex_usduah",
    "name": "USD / UAH",
    "category": "finance",
    "desc": "Hryvnia official exchange rate (NBU & cash market)",
    "iconKey": "currency",
    "template": "currency",
    "amount": "100",
    "converted": "4,135",
    "from": "USD",
    "to": "UAH",
    "fields": [
      {
        "key": "amount",
        "label": "Amount (USD)",
        "type": "number",
        "default": 100
      }
    ]
  },
  {
    "id": "fin_gold",
    "name": "Gold & Silver",
    "category": "finance",
    "desc": "Precious metals spot price per troy ounce",
    "iconKey": "stocks",
    "template": "key_value_list",
    "items": [
      {
        "label": "Gold (XAU)",
        "value": "$2,740 / oz"
      },
      {
        "label": "Silver (XAG)",
        "value": "$33.40 / oz"
      },
      {
        "label": "Trend",
        "value": "+0.8% today"
      }
    ],
    "fields": [
      {
        "key": "symbol",
        "label": "Symbol",
        "type": "text",
        "default": "GC=F"
      }
    ]
  },
  {
    "id": "prod_day_timeline",
    "name": "Day Timeline",
    "category": "productivity",
    "desc": "Your whole day on one line: hours by kind of app, focus rounds, meetings, sunrise and sunset",
    "iconKey": "timer",
    "template": "timeline",
    "fields": [
      {
        "key": "work_hours",
        "label": "Work hours goal",
        "type": "number",
        "default": 8
      }
    ]
  },
  {
    "id": "prod_screentime",
    "name": "Screen Time",
    "category": "productivity",
    "desc": "Today's time in front of the PC, hour by hour - and every app's, by day and by week",
    "iconKey": "screentime_watch",
    "template": "screentime",
    "fields": [
      {
        "key": "daily_limit_hours",
        "label": "Target hours",
        "type": "number",
        "default": 6
      }
    ]
  },
  {
    "id": "prod_pomodoro",
    "name": "Pomodoro",
    "category": "productivity",
    "desc": "Focus rounds and breaks you start and skip from the bar",
    "iconKey": "pomodoro",
    "template": "pomodoro",
    "fields": [
      {
        "key": "work_mins",
        "label": "Focus round (mins)",
        "type": "number",
        "default": 25
      },
      {
        "key": "break_mins",
        "label": "Break (mins)",
        "type": "number",
        "default": 5
      }
    ]
  },
  {
    "id": "prod_timer",
    "name": "Timer",
    "category": "productivity",
    "desc": "A countdown that starts in one click",
    "iconKey": "timer",
    "template": "timer",
    "fields": [
      {
        "key": "duration_mins",
        "label": "Duration (mins)",
        "type": "number",
        "default": 1
      }
    ]
  },
  {
    "id": "prod_stopwatch",
    "name": "Stopwatch",
    "category": "productivity",
    "desc": "Start, pause and lap from the bar; the card keeps every lap",
    "iconKey": "stopwatch",
    "template": "stopwatch",
    "fields": [
      {
        "key": "show_millis",
        "label": "Show milliseconds",
        "type": "switch",
        "default": false
      }
    ]
  },
  {
    "id": "prod_todos",
    "name": "Todos",
    "category": "productivity",
    "desc": "Your next open task with a progress ring; tick it off from the dock",
    "iconKey": "todos",
    "template": "todos",
    "fields": [
      {
        "key": "tasks",
        "label": "Tasks (comma-separated)",
        "type": "text",
        "placeholder": "Ship update, Review PR, Fix bug",
        "default": "Ship update, Review PR, Fix bug"
      }
    ]
  },
  {
    "id": "prod_notes_memo",
    "name": "Notes",
    "category": "productivity",
    "desc": "Your latest note, one click from editing",
    "iconKey": "notes_pad",
    "template": "notes_memo",
    "fields": [
      {
        "key": "memo_title",
        "label": "Memo Title",
        "type": "text",
        "default": "Meeting notes"
      },
      {
        "key": "memo_text",
        "label": "Memo Body",
        "type": "text",
        "default": "Discuss launch timeline and assign..."
      }
    ]
  },
  {
    "id": "prod_calendar_event",
    "name": "Calendar",
    "category": "productivity",
    "desc": "Your next event and how soon it starts. Google, Outlook and iCloud events sit next to renewals",
    "iconKey": "calendar_badge",
    "template": "calendar_event",
    "fields": [
      {
        "key": "ical_url",
        "label": "Private iCal URL (Google/Outlook)",
        "type": "password",
        "placeholder": "https://calendar.google.com/calendar/ical/.../basic.ics"
      }
    ]
  },
  {
    "id": "prod_currency_calc",
    "name": "Currency",
    "category": "productivity",
    "desc": "Convert between currencies at current rates",
    "iconKey": "currency",
    "template": "currency",
    "amount": "500",
    "converted": "74,44",
    "from": "CNY",
    "to": "USD",
    "fields": [
      {
        "key": "from_currency",
        "label": "From Currency",
        "type": "text",
        "default": "CNY"
      },
      {
        "key": "to_currency",
        "label": "To Currency",
        "type": "text",
        "default": "USD"
      },
      {
        "key": "amount",
        "label": "Amount",
        "type": "number",
        "default": 500
      }
    ]
  },
  {
    "id": "prod_minimal_clock",
    "name": "Minimal Clock",
    "category": "productivity",
    "desc": "Sleek ultra-clean typography clock face",
    "iconKey": "timer",
    "template": "minimal_clock",
    "fields": [
      {
        "key": "hour_24",
        "label": "24-hour clock",
        "type": "switch",
        "default": true
      },
      {
        "key": "show_seconds",
        "label": "Show seconds",
        "type": "switch",
        "default": false
      }
    ]
  },
  {
    "id": "prod_world_clock",
    "name": "World Clock",
    "category": "productivity",
    "desc": "Multi-timezone clock: Kyiv, London, New York, Tokyo",
    "iconKey": "timer",
    "template": "world_clock",
    "fields": [
      {
        "key": "cities",
        "label": "Cities (comma-separated)",
        "type": "text",
        "default": "Kyiv, London, New York, Tokyo"
      }
    ]
  },
  {
    "id": "prod_habits",
    "name": "Habit Streak",
    "category": "productivity",
    "desc": "Daily habit circles: Code, Gym, Reading, Meditation",
    "iconKey": "habits",
    "template": "habits",
    "fields": [
      {
        "key": "habits",
        "label": "Habits (comma-separated)",
        "type": "text",
        "default": "Code, Gym, Reading, Meditation"
      }
    ]
  },
  {
    "id": "prod_water",
    "name": "Water Tracker",
    "category": "productivity",
    "desc": "Glasses of water consumed today towards your 2L goal",
    "iconKey": "water",
    "template": "water",
    "fields": [
      {
        "key": "goal_cups",
        "label": "Goal cups per day",
        "type": "number",
        "default": 8
      },
      {
        "key": "cup_ml",
        "label": "Cup size (mL)",
        "type": "number",
        "default": 250
      }
    ]
  },
  {
    "id": "prod_standup",
    "name": "Break Reminder",
    "category": "productivity",
    "desc": "Reminds you to look away from screen and stretch",
    "iconKey": "timer",
    "template": "break_reminder",
    "fields": [
      {
        "key": "interval_mins",
        "label": "Break interval (mins)",
        "type": "number",
        "default": 45
      }
    ]
  },
  {
    "id": "prod_quote",
    "name": "Daily Quote",
    "category": "productivity",
    "desc": "Curated daily philosophy, stoicism and wisdom snippet",
    "iconKey": "notes_pad",
    "template": "quote",
    "fields": [
      {
        "key": "category",
        "label": "Quote Category",
        "type": "select",
        "options": [
          "stoicism",
          "philosophy",
          "tech",
          "creativity"
        ],
        "default": "stoicism"
      }
    ]
  },
  {
    "id": "prod_year_progress",
    "name": "Year Progress",
    "category": "productivity",
    "desc": "Visual bar showing progress of current calendar year",
    "iconKey": "timer",
    "template": "year_progress",
    "fields": [
      {
        "key": "target_year",
        "label": "Target Year",
        "type": "number",
        "default": 2026
      }
    ]
  },
  {
    "id": "sys_cpu",
    "name": "CPU Core",
    "category": "system",
    "desc": "Detailed processor frequency, core usage and thread load",
    "iconKey": "cpu",
    "template": "hardware_stat",
    "metric": "cpu",
    "fields": [
      {
        "key": "update_rate_sec",
        "label": "Update interval (sec)",
        "type": "number",
        "default": 2
      },
      {
        "key": "show_frequency",
        "label": "Show clock speed",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "sys_ram",
    "name": "RAM Memory",
    "category": "system",
    "desc": "Live memory allocation, cache buffer and available GB",
    "iconKey": "ram",
    "template": "hardware_stat",
    "metric": "ram",
    "fields": [
      {
        "key": "update_rate_sec",
        "label": "Update interval (sec)",
        "type": "number",
        "default": 2
      }
    ]
  },
  {
    "id": "sys_gpu",
    "name": "GPU Graphics",
    "category": "system",
    "desc": "Dedicated graphics card engine load and temperature",
    "iconKey": "gpu",
    "template": "hardware_stat",
    "metric": "gpu",
    "fields": [
      {
        "key": "update_rate_sec",
        "label": "Update interval (sec)",
        "type": "number",
        "default": 2
      }
    ]
  },
  {
    "id": "sys_thermals",
    "name": "Thermals",
    "category": "system",
    "desc": "Hardware temperature sensors for CPU, GPU and NVMe",
    "iconKey": "cpu",
    "template": "hardware_stat",
    "metric": "temp",
    "fields": [
      {
        "key": "temp_unit",
        "label": "Unit",
        "type": "select",
        "options": [
          "Celsius",
          "Fahrenheit"
        ],
        "default": "Celsius"
      }
    ]
  },
  {
    "id": "sys_disk_c",
    "name": "Drive C: (OS)",
    "category": "system",
    "desc": "System drive storage capacity and free space",
    "iconKey": "disk",
    "template": "hardware_stat",
    "metric": "disk",
    "fields": [
      {
        "key": "drive_letter",
        "label": "Drive",
        "type": "text",
        "default": "C:"
      }
    ]
  },
  {
    "id": "sys_disk_d",
    "name": "Drive D: (Data)",
    "category": "system",
    "desc": "Secondary storage SSD/HDD space utilization",
    "iconKey": "disk",
    "template": "hardware_stat",
    "metric": "disk",
    "fields": [
      {
        "key": "drive_letter",
        "label": "Drive",
        "type": "text",
        "default": "D:"
      }
    ]
  },
  {
    "id": "sys_network_speed",
    "name": "Network Speed",
    "category": "system",
    "desc": "Real-time bandwidth throughput: Download and Upload",
    "iconKey": "network",
    "template": "hardware_stat",
    "metric": "network",
    "fields": [
      {
        "key": "update_rate_sec",
        "label": "Update interval (sec)",
        "type": "number",
        "default": 1
      }
    ]
  },
  {
    "id": "sys_ping",
    "name": "Ping Latency",
    "category": "system",
    "desc": "Network round-trip latency to Cloudflare / Google DNS",
    "iconKey": "network",
    "template": "dev_stat",
    "title": "Internet Ping",
    "meta": "0% packet loss",
    "value": "11 ms",
    "accent": "#10b981",
    "fields": [
      {
        "key": "host",
        "label": "Ping Host",
        "type": "text",
        "default": "1.1.1.1"
      }
    ]
  },
  {
    "id": "sys_uptime",
    "name": "System Uptime",
    "category": "system",
    "desc": "Continuous duration since Windows was last booted",
    "iconKey": "cpu",
    "template": "dev_stat",
    "title": "PC Uptime",
    "meta": "System healthy",
    "value": "4d 18h 32m",
    "accent": "#a78bfa",
    "fields": [
      {
        "key": "show_days",
        "label": "Show days format",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "sys_processes",
    "name": "Top Processes",
    "category": "system",
    "desc": "Highest CPU and memory consuming background processes",
    "iconKey": "cpu",
    "template": "key_value_list",
    "items": [
      {
        "label": "atelier.exe",
        "value": "4.2% CPU"
      },
      {
        "label": "chrome.exe",
        "value": "3.1% CPU"
      },
      {
        "label": "code.exe",
        "value": "2.8% CPU"
      }
    ],
    "fields": [
      {
        "key": "top_count",
        "label": "Top processes count",
        "type": "number",
        "default": 5
      }
    ]
  },
  {
    "id": "sys_fans",
    "name": "Fan Speed RPM",
    "category": "system",
    "desc": "Chassis and CPU cooler RPM tachometer",
    "iconKey": "cpu",
    "template": "dev_stat",
    "title": "Cooling Fans",
    "meta": "Case Fans 980 RPM",
    "value": "1,120 RPM",
    "accent": "#0ea5e9",
    "fields": [
      {
        "key": "unit",
        "label": "Unit",
        "type": "text",
        "default": "RPM"
      }
    ]
  },
  {
    "id": "sys_wifi",
    "name": "Wi-Fi Signal",
    "category": "system",
    "desc": "Connected Wi-Fi network SSID, frequency and dBm strength",
    "iconKey": "network",
    "template": "dev_stat",
    "title": "Wi-Fi 6",
    "meta": "Home-Fiber 5G",
    "value": "-48 dBm (96%)",
    "accent": "#60a5fa",
    "fields": [
      {
        "key": "adapter",
        "label": "Adapter",
        "type": "text",
        "default": "Wi-Fi"
      }
    ]
  },
  {
    "id": "sys_bluetooth",
    "name": "Bluetooth Link",
    "category": "system",
    "desc": "Connected wireless headphones, mice & peripherals",
    "iconKey": "volume",
    "template": "key_value_list",
    "items": [
      {
        "label": "Sony WH-1000XM5",
        "value": "80%"
      },
      {
        "label": "MX Master Mouse",
        "value": "92%"
      }
    ],
    "fields": [
      {
        "key": "check_interval",
        "label": "Check interval (sec)",
        "type": "number",
        "default": 5
      }
    ]
  },
  {
    "id": "sys_vram",
    "name": "VRAM Usage",
    "category": "system",
    "desc": "Dedicated video memory buffer for gaming and AI models",
    "iconKey": "gpu",
    "template": "hardware_stat",
    "metric": "gpu",
    "fields": [
      {
        "key": "show_total",
        "label": "Show total VRAM",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "ctrl_volume",
    "name": "Master Volume",
    "category": "controls",
    "desc": "Desktop audio volume slider and instant mute toggle",
    "iconKey": "volume",
    "template": "control_volume",
    "fields": [
      {
        "key": "step",
        "label": "Volume step (%)",
        "type": "number",
        "default": 5
      }
    ]
  },
  {
    "id": "ctrl_mic_mute",
    "name": "Mic Mute Switch",
    "category": "controls",
    "desc": "Microphone activity indicator and global mute button",
    "iconKey": "mic",
    "template": "control_mic",
    "fields": [
      {
        "key": "push_to_talk",
        "label": "Push to talk mode",
        "type": "switch",
        "default": false
      }
    ]
  },
  {
    "id": "ctrl_brightness",
    "name": "Brightness",
    "category": "controls",
    "desc": "Monitor display brightness level control",
    "iconKey": "weather_sun",
    "template": "control_brightness",
    "fields": [
      {
        "key": "step",
        "label": "Brightness step (%)",
        "type": "number",
        "default": 10
      }
    ]
  },
  {
    "id": "ctrl_audio_switch",
    "name": "Audio Switcher",
    "category": "controls",
    "desc": "One-click switcher between Speakers and Headphones",
    "iconKey": "volume",
    "template": "control_switcher",
    "fields": [
      {
        "key": "auto_switch",
        "label": "Auto detect headphones",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "ctrl_recycle_bin",
    "name": "Recycle Bin",
    "category": "controls",
    "desc": "Windows recycle bin item count, size and 1-click clean",
    "iconKey": "recycle",
    "template": "control_recycle",
    "fields": [
      {
        "key": "confirm_empty",
        "label": "Confirm before emptying",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "util_hackernews",
    "name": "Hacker News",
    "category": "utilities",
    "desc": "Top trending technology headline and discussion points",
    "iconKey": "hackernews",
    "template": "news",
    "source": "Hacker News #1",
    "title": "Show HN: Atelier Desktop Windows Widgets",
    "meta": "384 pts · 142 comments",
    "fields": [
      {
        "key": "feed",
        "label": "Feed type",
        "type": "select",
        "options": [
          "top",
          "new",
          "best",
          "show"
        ],
        "default": "top"
      }
    ]
  },
  {
    "id": "util_rss",
    "name": "RSS News Feed",
    "category": "utilities",
    "desc": "Latest headline from any custom RSS or Atom news feed",
    "iconKey": "rss",
    "template": "news",
    "source": "Tech News",
    "title": "Next-gen AI models drop latency by 40%",
    "meta": "12m ago",
    "fields": [
      {
        "key": "feed_url",
        "label": "RSS Feed URL",
        "type": "text",
        "placeholder": "https://feeds.bbci.co.uk/news/technology/rss.xml",
        "default": "https://feeds.bbci.co.uk/news/technology/rss.xml"
      }
    ]
  },
  {
    "id": "util_nasa_apod",
    "name": "NASA APOD",
    "category": "utilities",
    "desc": "NASA Astronomy Picture of the Day with caption",
    "iconKey": "nasa_apod",
    "template": "news",
    "source": "NASA APOD",
    "title": "Andromeda Galaxy M31 in Ultra Resolution",
    "meta": "Photo of the Day",
    "fields": [
      {
        "key": "api_key",
        "label": "NASA API Key (optional)",
        "type": "password",
        "placeholder": "DEMO_KEY",
        "default": "DEMO_KEY"
      }
    ]
  },
  {
    "id": "util_air_quality",
    "name": "Air Quality (AQI)",
    "category": "utilities",
    "desc": "Air Quality Index, PM2.5 levels and health category",
    "iconKey": "air_quality",
    "template": "dev_stat",
    "title": "Air Quality",
    "meta": "PM2.5: 6.8 ug/m3",
    "value": "28 AQI Good",
    "accent": "#10b981",
    "fields": [
      {
        "key": "city",
        "label": "City name",
        "type": "text",
        "placeholder": "e.g. Kyiv",
        "default": "Kyiv"
      }
    ]
  },
  {
    "id": "util_sun_moon",
    "name": "Sun & Moon",
    "category": "utilities",
    "desc": "Sunrise, sunset countdown and current lunar moon phase",
    "iconKey": "sun_moon",
    "template": "key_value_list",
    "items": [
      {
        "label": "Sunset",
        "value": "16:42"
      },
      {
        "label": "Sunrise",
        "value": "06:58"
      },
      {
        "label": "Moon",
        "value": "Waxing Crescent"
      }
    ],
    "fields": [
      {
        "key": "city",
        "label": "City name",
        "type": "text",
        "placeholder": "e.g. Kyiv",
        "default": "Kyiv"
      }
    ]
  },
  {
    "id": "ai_openai_balance",
    "name": "OpenAI Balance",
    "category": "ai",
    "desc": "API credit balance, daily spend and rate limit tier",
    "iconKey": "openai_balance",
    "template": "dev_stat",
    "title": "OpenAI API",
    "meta": "Usage Tier 4",
    "value": "$124.50",
    "sub": "$18.20 spent today · 85% limit",
    "fields": [
      {
        "key": "api_key",
        "label": "OpenAI Secret Key",
        "type": "password",
        "placeholder": "sk-..."
      }
    ]
  },
  {
    "id": "ai_anthropic_balance",
    "name": "Anthropic Balance",
    "category": "ai",
    "desc": "Claude API prepaid credits and organization consumption",
    "iconKey": "anthropic_balance",
    "template": "dev_stat",
    "title": "Anthropic API",
    "meta": "Organization",
    "value": "$86.20",
    "sub": "$12.40 spent today · Active key",
    "fields": [
      {
        "key": "api_key",
        "label": "Anthropic Key",
        "type": "password",
        "placeholder": "sk-ant-..."
      }
    ]
  },
  {
    "id": "prod_gcal",
    "name": "Google Calendar",
    "category": "productivity",
    "desc": "Upcoming meetings and events with live countdown",
    "iconKey": "google_calendar",
    "template": "calendar_event",
    "title": "Design Review",
    "meta": "15:00 · in 24 min",
    "fields": [
      {
        "key": "ical_url",
        "label": "Private iCal URL (Google Calendar)",
        "type": "password",
        "placeholder": "https://calendar.google.com/calendar/ical/.../basic.ics"
      }
    ]
  },
  {
    "id": "prod_todo_list",
    "name": "To-Do List",
    "category": "productivity",
    "desc": "Task list, completion rings and quick desktop checkboxes",
    "iconKey": "todos",
    "template": "todos",
    "title": "Ship the 0.1.11 update",
    "fields": [
      {
        "key": "tasks",
        "label": "Tasks (comma-separated)",
        "type": "text",
        "default": "Ship update, Review PR, Fix bug"
      }
    ]
  },
  {
    "id": "prod_todoist",
    "name": "Todoist",
    "category": "productivity",
    "desc": "Synced Todoist tasks, karma score and today overdue items",
    "iconKey": "todoist",
    "template": "dev_stat",
    "title": "Todoist",
    "meta": "Karma 8,420",
    "value": "7 tasks today",
    "sub": "Next: Product design review",
    "fields": [
      {
        "key": "token",
        "label": "Todoist API Token",
        "type": "password",
        "placeholder": "API token"
      }
    ]
  },
  {
    "id": "prod_calculator",
    "name": "Quick Calculator",
    "category": "productivity",
    "desc": "Instant desktop calculator, math expressions and unit conversion",
    "iconKey": "calculator",
    "template": "dev_stat",
    "title": "Calculator",
    "meta": "History",
    "value": "1,024 × 768",
    "sub": "= 786,432 pixels",
    "fields": [
      {
        "key": "precision",
        "label": "Decimals",
        "type": "number",
        "default": 2
      }
    ]
  },
  {
    "id": "prod_clipboard",
    "name": "Clipboard History",
    "category": "productivity",
    "desc": "Recent clipboard text snippets, code blocks and one-click copy",
    "iconKey": "clipboard",
    "template": "dev_stat",
    "title": "Clipboard",
    "meta": "32 items",
    "value": "git commit -m \"feat:...\"",
    "sub": "Copied 2m ago · Text snippet",
    "fields": [
      {
        "key": "max_items",
        "label": "History size",
        "type": "number",
        "default": 30
      }
    ]
  }
];
