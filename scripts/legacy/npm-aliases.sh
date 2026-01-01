# Shell aliases for npm productivity
# Add these to your ~/.zshrc or ~/.bashrc

# ═══════════════════════════════════════════════════════════════════
# Stock Verify Project Aliases
# ═══════════════════════════════════════════════════════════════════

# Navigation
alias cdsv='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped'
alias cdfe='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/frontend'
alias cdbe='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/backend'

# Frontend shortcuts
alias svfe='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/frontend && npm start'
alias svweb='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/frontend && npm run web'
alias svtest='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/frontend && npm test'
alias svlint='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/frontend && npm run lint'
alias svci='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/frontend && npm run ci'

# Backend shortcuts
alias svbe='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/backend && source venv/bin/activate && uvicorn server:app --reload'
alias svbetest='cd ~/cursor\ new/STOCK_VERIFY_2-db-maped/backend && pytest tests/ -v'

# Full stack
alias svstart='~/cursor\ new/STOCK_VERIFY_2-db-maped/start.sh'
alias svstop='~/cursor\ new/STOCK_VERIFY_2-db-maped/scripts/dev/stop.sh'

# ═══════════════════════════════════════════════════════════════════
# General npm aliases (from awesome-npm)
# ═══════════════════════════════════════════════════════════════════

alias ni='npm install'
alias nid='npm install --save-dev'
alias nig='npm install --global'
alias nt='npm test'
alias nit='npm install && npm test'
alias nk='npm link'
alias nr='npm run'
alias ns='npm start'
alias nf='npm cache clean --force && rm -rf node_modules && npm install'
alias nlg='npm list --global --depth=0'
alias nup='npm update'
alias nout='npm outdated'
alias nck='npx npm-check -u'

# Package inspection
alias nv='npm version'
alias nwhy='npm explain'
alias nls='npm ls --depth=0'

# Audit & security
alias naud='npm audit'
alias naudfix='npm audit fix'
