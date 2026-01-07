# 🤖 Auto-Commit System

This repository includes automated Git commit scripts to streamline your workflow.

---

## 📜 Available Scripts

### 1. **auto-commit.ps1** - Full Auto-Commit with Details
**What it does:**
- ✅ Checks for changes
- 📦 Stages all changes (`git add .`)
- 💾 Commits with timestamp
- 🚀 Pushes to GitHub automatically

**Usage:**
```powershell
.\auto-commit.ps1
```

**Output Example:**
```
🔄 Auto Commit Script Started...
📝 Changes detected:
 M backend/server.py
 ?? new-file.txt

📦 Staging changes...
💾 Committing changes...
✅ Commit successful!

🚀 Pushing to GitHub...
✅ Push successful!

🎉 Auto-commit complete!
```

---

### 2. **quick-commit.ps1** - Quick One-Liner
**What it does:**
- Same as auto-commit.ps1 but faster
- Optional custom commit message

**Usage:**
```powershell
# Auto-generated message
.\quick-commit.ps1

# Custom message
.\quick-commit.ps1 "feat: add new feature"
```

---

### 3. **auto-save.ps1** - Continuous Auto-Save (Background Monitor)
**What it does:**
- 👁️ Monitors for file changes every 5 minutes
- 💾 Auto-commits when changes detected
- ♾️ Runs continuously until stopped

**Usage:**
```powershell
# Start monitoring (runs forever)
.\auto-save.ps1

# Stop: Press Ctrl+C
```

**Output Example:**
```
👁️ Git Auto-Save: Monitoring for changes...
Press Ctrl+C to stop

⏰ Auto-save triggered at 14:35:22
🔄 Auto Commit Script Started...
✅ Commit successful!
✅ Push successful!

👁️ Resuming monitoring...
```

---

## 🚀 Quick Start Guide

### **Option A: Manual Commit (When You Want)**
```powershell
# Run once when you're ready
.\auto-commit.ps1
```

### **Option B: Quick Commit with Custom Message**
```powershell
.\quick-commit.ps1 "fix: resolve login issue"
```

### **Option C: Automatic Background Commits**
```powershell
# Start background auto-save (every 5 minutes)
.\auto-save.ps1
```

---

## ⚙️ Configuration

### Change Auto-Save Interval
Edit `auto-save.ps1` and modify this line:
```powershell
$interval = 300  # Change to seconds you want (300 = 5 minutes)
```

**Examples:**
- `60` = 1 minute
- `300` = 5 minutes (default)
- `600` = 10 minutes
- `1800` = 30 minutes

---

## 🎯 Best Practices

### ✅ **DO:**
- Use **quick-commit.ps1** for daily work (manual control)
- Use **auto-save.ps1** during long coding sessions
- Add meaningful custom messages when needed

### ❌ **DON'T:**
- Don't run auto-save.ps1 if you commit manually often (duplicate commits)
- Don't commit sensitive data (check .gitignore first)
- Don't push broken code (test before committing)

---

## 🔧 Troubleshooting

### **"Execution policy" error:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### **"Permission denied" when pushing:**
- Check your GitHub credentials
- Verify remote URL: `git remote -v`
- Ensure you have push access to the repository

### **Script doesn't detect changes:**
- Check if changes are gitignored
- Run `git status` manually to verify

### **Want to pause auto-save:**
- Press `Ctrl+C` in the terminal running auto-save.ps1

---

## 📊 Commit Message Format

**Auto-generated messages:**
```
auto: commit changes - 2025-11-04 14:30:15
```

**Custom messages:**
```powershell
.\quick-commit.ps1 "feat: add user authentication"
.\quick-commit.ps1 "fix: resolve database connection issue"
.\quick-commit.ps1 "docs: update README with setup instructions"
```

**Conventional Commit Prefixes:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

## 🛠️ Advanced Usage

### **Run Auto-Save in Background (Windows Task Scheduler)**

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., "At startup")
4. Set action: `powershell.exe`
5. Add arguments: `-File "D:\testapp\Stock_count\auto-save.ps1"`
6. Configure to run whether user is logged in or not

### **Create Git Alias**
Add to your `.gitconfig`:
```ini
[alias]
    ac = !powershell -File ./auto-commit.ps1
    qc = !powershell -File ./quick-commit.ps1
```

Then use:
```bash
git ac        # Auto-commit
git qc "msg"  # Quick commit with message
```

---

## 📝 Notes

- All scripts commit to the **`fixed`** branch (current branch)
- Changes are pushed to **`origin`** remote (GitHub)
- Scripts will fail gracefully if no changes exist
- Commit history will show timestamps for tracking

---

## ❓ FAQ

**Q: Will this commit untracked files?**
A: Yes, `git add .` stages all changes including new files.

**Q: Can I exclude certain files?**
A: Yes, add them to `.gitignore` file.

**Q: What if push fails?**
A: Script will show error. Check your internet connection and GitHub permissions.

**Q: Can I change the target branch?**
A: Yes, edit the scripts and change `fixed` to your branch name.

---

## 🎨 Customization Ideas

### Add File Count to Commit Message
```powershell
$fileCount = (git diff --name-only --cached | Measure-Object).Count
$commitMessage = "auto: commit $fileCount files - $timestamp"
```

### Add Notification Sound
```powershell
[System.Media.SystemSounds]::Asterisk.Play()
```

### Log to File
```powershell
Add-Content -Path "commit-log.txt" -Value "Committed at $timestamp"
```

---

## 📦 Repository Info

- **Repository:** https://github.com/mknoufi/STOCK_VERIFY_ui
- **Current Branch:** fixed
- **Auto-Commit Status:** ✅ Active

---

**Happy Coding! 🚀**
