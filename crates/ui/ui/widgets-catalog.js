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
    "id": "sys_tray",
    "name": "System Tray",
    "category": "system",
    "desc": "Windows notification area & tray flyout with live status",
    "iconKey": "tray",
    "template": "sys_tray",
    "defaultBg": "#1b2434",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "label",
        "label": "Title",
        "type": "text",
        "default": "System Tray"
      },
      {
        "key": "show_status",
        "label": "Show status subtitle",
        "type": "switch",
        "default": true
      }
    ]
  },
  {
    "id": "app_folder",
    "name": "App Group / Folder",
    "category": "system",
    "desc": "Group apps in a 2x2 mini grid. Click to expand full launcher.",
    "iconKey": "folder",
    "template": "app_folder",
    "defaultBg": "#1e2230",
    "defaultFg": "#ffffff",
    "fields": [
      {
        "key": "folder_name",
        "label": "Folder name",
        "type": "text",
        "default": "Apps"
      },
      {
        "key": "preset_apps",
        "label": "Included apps (comma separated or auto)",
        "type": "text",
        "default": "auto"
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
    "fields": []
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
    "fields": []
  },
  {
    "id": "ai_chatgpt",
    "name": "ChatGPT Usage",
    "category": "ai",
    "desc": "Live Codex plan quota windows through your installed Codex CLI; sign in to Codex with ChatGPT first",
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
        "key": "cli_path",
        "label": "Codex CLI executable",
        "type": "text",
        "auth": true,
        "default": "codex.exe",
        "placeholder": "codex.exe or an absolute path"
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
    "fields": []
  },
  {
    "id": "ai_grok",
    "name": "xAI API Balance",
    "category": "ai",
    "desc": "Team prepaid API credit balance; requires an xAI management key",
    "iconKey": "grok",
    "template": "ai_single_bar",
    "title": "Credits",
    "meta": "Fri 30",
    "pct": 28,
    "accent": "#22c55e",
    "fields": [
      {
        "key": "api_key",
        "label": "xAI management key",
        "type": "password",
        "placeholder": "Management API key"
      },
      {
        "key": "team_id",
        "label": "xAI Team ID",
        "type": "text",
        "placeholder": "Team UUID"
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
    "desc": "Live personal GLM Coding Plan quotas from Z.ai or BigModel; does not report pay-as-you-go credits",
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
        "label": "GLM Coding Plan API key",
        "type": "password",
        "placeholder": "API key"
      },
      {"key":"platform","label":"Account platform","type":"select","options":["Z.ai","BigModel"],"default":"Z.ai"}
    ]
  },
  {
    "id": "ai_opencode",
    "name": "OpenCode Usage",
    "category": "ai",
    "desc": "Latest assistant token usage from a running local OpenCode server; session ID required",
    "iconKey": "opencode",
    "template": "ai_stat",
    "title": "Session",
    "meta": "last 5h",
    "value": "182.4K",
    "fields": [
      {"key":"server_port","label":"Local server port","type":"number","default":4096},
      {"key":"session_id","label":"Session ID","type":"text"},
      {"key":"api_version","label":"Server API","type":"select","options":["legacy","v2"],"default":"legacy"},
      {"key":"server_password","label":"Server password (optional; username opencode)","type":"password"}
    ]
  },
  {
    "id": "ai_perplexity",
    "name": "Perplexity Credits",
    "category": "ai",
    "desc": "Reported account credits and usage through a manually supplied Perplexity web-session token; separate from Pro search limits",
    "iconKey": "perplexity",
    "template": "dev_stat",
    "title": "Account credits",
    "meta": "Web session",
    "value": "—",
    "pct": 88,
    "accent": "#20b2aa",
    "fields": [
      {"key":"cookie_name","label":"Session cookie name","type":"select","options":["__Secure-next-auth.session-token","__Secure-authjs.session-token","authjs.session-token","next-auth.session-token"],"default":"__Secure-next-auth.session-token"},
      {
        "key": "session_token",
        "label": "Perplexity session-token value",
        "type": "password",
        "placeholder": "Web session token; not a pplx API key"
      }
    ]
  },
  {
    "id": "ai_cursor",
    "name": "Cursor Team Usage",
    "category": "ai",
    "desc": "Team Agent, Chat and Composer request counts today (UTC); requires Team Admin API access",
    "iconKey": "cursor",
    "template": "ai_single_bar",
    "title": "Fast Credits",
    "meta": "412 / 500",
    "pct": 82,
    "accent": "#a855f7",
    "fields": [
      {
        "key": "api_key",
        "label": "Cursor Team Admin API key",
        "type": "password",
        "placeholder": "Team admin API key"
      }
    ]
  },
  {
    "id": "ai_copilot",
    "name": "GitHub Copilot",
    "category": "ai",
    "desc": "Latest daily organization usage from Copilot reports; requires organization metrics permission",
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
        "label": "GitHub token (Organization Copilot metrics read)",
        "type": "password",
        "placeholder": "GitHub token"
      },
      {
        "key": "organization",
        "label": "GitHub organization",
        "type": "text"
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
    "desc": "Latest GitLab project pipeline status and branch",
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
    "desc": "Local Docker container states and sampled CPU/RAM usage, with overview and per-container views",
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
    "fields": [{"key":"metric","label":"Display","type":"select","options":["Overview","CPU","Memory","Containers"],"default":"Overview"},{"key":"top_count","label":"Visible containers","type":"number","default":5}]
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
      },
      {
        "key": "team_id",
        "label": "Team ID (optional)",
        "type": "text",
        "placeholder": "team_..."
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
    "desc": "Estimated fixed-price MRR by currency; unsupported discounts, trials and tiered prices require Stripe Billing Analytics",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Stripe MRR",
    "meta": "+18.4% MoM",
    "value": "$12,450",
    "sub": "184 active subscribers",
    "accent": "#635bff",
    "fields": [
      {"key":"auth_mode","label":"Data source","type":"select","options":["API estimate","Billing page"],"default":"API estimate"},
      {
        "key": "api_key",
        "when":{"key":"auth_mode","value":"API estimate"},
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
    "desc": "Gross captured amounts for successful charges created today, by currency, before refunds; local time",
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
    "desc": "This month's charges and refunds after their transaction fees, by settlement currency; local time",
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
    "desc": "Monthly recurring revenue and active subscriptions from Polar metrics",
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
        "label": "Organization ID (optional for organization token)",
        "type": "text",
        "placeholder": "Organization UUID"
      },
      {
        "key": "currency",
        "label": "Polar reporting currency",
        "type": "text",
        "default": "USD"
      }
    ]
  },
  {
    "id": "rev_lemonsqueezy",
    "name": "Lemon Squeezy",
    "category": "revenue",
    "desc": "Store order count and the most recent order status",
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
    "desc": "Gross successful payments by currency and payment-record success rate, with UTC day/month reporting",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Dodo Sales",
    "meta": "3.8% conv.",
    "value": "$4,150",
    "sub": "Global checkout",
    "accent": "#ff4d6d",
    "fields": [
      {
        "key": "metric",
        "label": "Metric",
        "type": "select",
        "options": [
          "Gross sales",
          "Payment success rate",
          "Latest payment"
        ],
        "default": "Gross sales"
      },
      {
        "key": "report_period",
        "label": "Report period (UTC)",
        "type": "select",
        "options": [
          "Today",
          "Month to date"
        ],
        "default": "Today"
      },
      {
        "key": "api_key",
        "label": "Dodo Payments Key",
        "type": "password",
        "placeholder": "API key"
      },
      {
        "key": "environment",
        "label": "Environment",
        "type": "select",
        "options": [
          "live",
          "test"
        ],
        "default": "live"
      }
    ]
  },
  {
    "id": "rev_datafast",
    "name": "DataFast Live",
    "category": "revenue",
    "desc": "Visitors active in the last 10 minutes",
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
        "label": "Website ID (required for account token)",
        "type": "text",
        "placeholder": "prj_..."
      }
    ]
  },
  {
    "id": "rev_google_analytics",
    "name": "Google Analytics",
    "category": "revenue",
    "desc": "GA4 users and views in the last 30 minutes; use a service-account JSON key with property Viewer access for automatic authentication",
    "iconKey": "googleanalytics",
    "template": "revenue_stat",
    "title": "GA4 Realtime",
    "meta": "Top: /pricing",
    "value": "86 active",
    "sub": "Active in past 30 min",
    "accent": "#f59e0b",
    "fields": [
      {"key":"auth_mode","label":"Authentication","type":"select","options":["OAuth access token","Service account"],"default":"OAuth access token"},
      {
        "key": "property_id",
        "label": "GA4 Property ID",
        "type": "text",
        "placeholder": "e.g. 123456789"
      },
      {
        "key": "access_token",
        "label": "Google OAuth access token (analytics.readonly)",
        "when":{"key":"auth_mode","value":"OAuth access token"},
        "type": "password",
        "placeholder": "OAuth access token; renew when expired"
      },
      {"key":"key_path","label":"Service-account JSON key path","type":"text","auth":true,"when":{"key":"auth_mode","value":"Service account"},"placeholder":"C:/keys/analytics.json"}
    ]
  },
  {
    "id": "rev_shopify",
    "name": "Shopify Store",
    "category": "revenue",
    "desc": "Orders, net payments, average active order value and unfulfilled orders; requires read_orders",
    "iconKey": "shopify",
    "template": "revenue_stat",
    "title": "Shopify Sales",
    "meta": "24 orders",
    "value": "$1,480.00",
    "sub": "Avg cart $61.60",
    "accent": "#96bf48",
    "fields": [
      {
        "key": "metric",
        "label": "Metric",
        "type": "select",
        "options": [
          "Sales overview",
          "Net payments",
          "Average order value",
          "Unfulfilled orders",
          "Order count"
        ],
        "default": "Sales overview"
      },
      {
        "key": "report_period",
        "label": "Report period (local time)",
        "type": "select",
        "options": [
          "Today",
          "Month to date"
        ],
        "default": "Today"
      },
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
    "desc": "Official Paddle MRR, annualized MRR, revenue and checkout conversion metrics; requires metrics.read",
    "iconKey": "stripe",
    "template": "revenue_stat",
    "title": "Paddle ARR",
    "meta": "+12 new seats",
    "value": "$88,400",
    "sub": "B2B enterprise tier",
    "accent": "#00cca3",
    "fields": [
      {
        "key": "metric",
        "label": "Metric",
        "type": "select",
        "options": [
          "MRR",
          "Annualized MRR",
          "Net revenue",
          "Checkout conversion",
          "Active subscriptions"
        ],
        "default": "MRR"
      },
      {
        "key": "report_days",
        "label": "Completed UTC days",
        "type": "number",
        "default": 30
      },
      {
        "key": "api_key",
        "label": "Paddle API Key",
        "type": "password",
        "placeholder": "API key"
      },
      {
        "key": "environment",
        "label": "Environment",
        "type": "select",
        "options": [
          "live",
          "sandbox"
        ],
        "default": "live"
      }
    ]
  },
  {
    "id": "rev_appstore",
    "name": "App Store Stats",
    "category": "revenue",
    "desc": "Daily sales-report net units and estimated proceeds by currency; optional SKU filter",
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
      },
      {"key":"key_path","label":"Local .p8 signing-key path","type":"text","auth":true},
      {"key":"vendor_number","label":"Apple vendor number","type":"text"},
      {"key":"report_date","label":"Report date YYYY-MM-DD (blank: yesterday)","type":"text"},
      {"key":"sku","label":"SKU filter (optional)","type":"text"}
    ]
  },
  {
    "id": "rev_playstore",
    "name": "Google Play",
    "category": "revenue",
    "desc": "Latest daily installs and active devices from monthly Play Console reports; data is delayed",
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
      },
      {"key":"key_path","label":"Local service-account JSON key path","type":"text","auth":true},
      {"key":"report_bucket","label":"Play Console report bucket","type":"text","placeholder":"pubsite_prod_rev_..."},
      {"key":"report_month","label":"Report month YYYYMM (blank: current UTC month)","type":"text"}
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
        "key": "api_key",
        "label": "FMP API key (index quotes access)",
        "type": "password"
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
        "key": "api_key",
        "label": "FMP API key (index quotes access)",
        "type": "password"
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
      },
      { "key": "api_key", "label": "Alpha Vantage API key", "type": "password" }
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
      },
      { "key": "api_key", "label": "Alpha Vantage API key", "type": "password" }
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
      },
      { "key": "api_key", "label": "Alpha Vantage API key", "type": "password" }
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
        "key": "api_key",
        "label": "Twelve Data API key (metals access)",
        "type": "password"
      }
    ]
  },
  {
    "id": "prod_day_timeline",
    "name": "Day Timeline",
    "category": "productivity",
    "desc": "Active computer use by hour, recorded locally while this widget or Screen Time is enabled",
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
    "desc": "Active computer use and foreground apps, recorded locally for up to seven days while enabled",
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
    "desc": "Start, pause and record up to 100 laps; shared across desktop and taskbar and restored after restart",
    "iconKey": "stopwatch",
    "template": "stopwatch",
    "fields": [
      {
        "key": "show_millis",
        "label": "Show milliseconds",
        "type": "switch",
        "default": false
      },
      {"key":"show_laps","label":"Show lap history on desktop","type":"switch","default":true}
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
    "desc": "A visible and audible break reminder while the widget is open",
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
    "desc": "A daily reflection prompt for your chosen category",
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
    "name": "GPU Fan Speed",
    "category": "system",
    "desc": "NVIDIA GPU fan speed when exposed by the driver",
    "iconKey": "cpu",
    "template": "dev_stat",
    "title": "Cooling Fans",
    "meta": "Case Fans 980 RPM",
    "value": "1,120 RPM",
    "accent": "#0ea5e9",
    "fields": []
  },
  {
    "id": "sys_wifi",
    "name": "Wi-Fi Signal",
    "category": "system",
    "desc": "Connected Wi-Fi network and Windows signal quality",
    "iconKey": "network",
    "template": "dev_stat",
    "title": "Wi-Fi 6",
    "meta": "Home-Fiber 5G",
    "value": "-48 dBm (96%)",
    "accent": "#60a5fa",
    "fields": [
      {
        "key": "adapter",
        "label": "Adapter name contains (optional)",
        "type": "text",
        "default": ""
      }
    ]
  },
  {
    "id": "sys_bluetooth",
    "name": "Bluetooth Link",
    "category": "system",
    "desc": "Connected Bluetooth devices reported by Windows",
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
    "desc": "NVIDIA GPU dedicated memory used and total",
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
    "desc": "Mute or unmute the default microphone",
    "iconKey": "mic",
    "template": "control_mic",
    "fields": []
  },
  {
    "id": "ctrl_brightness",
    "name": "Brightness",
    "category": "controls",
    "desc": "Monitor display brightness level control",
    "iconKey": "weather_sun",
    "template": "control_brightness",
    "fields": []
  },
  {
    "id": "ctrl_audio_switch",
    "name": "Audio Switcher",
    "category": "controls",
    "desc": "Select the default Windows audio output directly from the widget",
    "iconKey": "volume",
    "template": "control_switcher",
    "fields": [{"key":"also_communications","label":"Also switch the communications output","type":"switch","default":false}]
  },
  {
    "id": "ctrl_recycle_bin",
    "name": "Recycle Bin",
    "category": "controls",
    "desc": "Windows recycle bin item count, size and 1-click clean",
    "iconKey": "recycle",
    "template": "control_recycle",
    "fields": []
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
    "name": "OpenAI Balance & Spend",
    "category": "ai",
    "desc": "API spend with an Admin key, or a selected prepaid credit amount from your signed-in Billing page.",
    "iconKey": "openai_balance",
    "template": "dev_stat",
    "title": "OpenAI API",
    "meta": "Usage Tier 4",
    "value": "$124.50",
    "sub": "$18.20 spent today · 85% limit",
    "fields": [
      {
        "key": "api_key",
        "when":{"key":"metric","value":"API spend"},
        "label": "OpenAI organization Admin key",
        "type": "password",
        "placeholder": "sk-admin-..."
      },
      {"key":"metric","label":"Metric","type":"select","options":["API spend","Prepaid balance"],"default":"API spend"},
      {"key":"period","when":{"key":"metric","value":"API spend"},"label":"Spend period","type":"select","options":["Month to date (UTC)","Today (UTC)"],"default":"Month to date (UTC)"}
    ]
  },
  {
    "id": "ai_anthropic_balance",
    "name": "Anthropic Balance & Spend",
    "category": "ai",
    "desc": "API spend with an Admin key, or a selected USD credit amount from your signed-in Billing page. API cost reports can lag up to 24 hours.",
    "iconKey": "anthropic_balance",
    "template": "dev_stat",
    "title": "Anthropic API",
    "meta": "Organization",
    "value": "$86.20",
    "sub": "$12.40 spent today · Active key",
    "fields": [
      {
        "key": "api_key",
        "when":{"key":"metric","value":"API spend"},
        "label": "Anthropic organization Admin key",
        "type": "password",
        "placeholder": "sk-ant-admin01-..."
      },
      {"key":"metric","label":"Metric","type":"select","options":["API spend","Prepaid balance"],"default":"API spend"},
      {"key":"period","when":{"key":"metric","value":"API spend"},"label":"Spend period","type":"select","options":["Month to date (UTC)","Today (UTC)"],"default":"Month to date (UTC)"}
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
    "desc": "Calculate arithmetic expressions with adjustable decimal precision",
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
    "desc": "Recent text copied while this widget is open; history clears when Atelier exits",
    "iconKey": "clipboard",
    "template": "dev_stat",
    "title": "Clipboard",
    "meta": "Recent items",
    "value": "Copied text appears here",
    "sub": "Select an item to copy",
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
