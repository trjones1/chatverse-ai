# 🚀 Localhost Character Testing Guide

## Quick Character Testing on localhost:3000

### Method 1: Environment Variable (Recommended)
Set `NEXT_PUBLIC_CHARACTER_KEY` in your `.env.local`:

```bash
# Test different characters
NEXT_PUBLIC_CHARACTER_KEY=chase    # for Chase (fuckboy)
NEXT_PUBLIC_CHARACTER_KEY=dom      # for Dominic 
NEXT_PUBLIC_CHARACTER_KEY=ethan    # for Ethan
NEXT_PUBLIC_CHARACTER_KEY=jayden   # for Jayden
NEXT_PUBLIC_CHARACTER_KEY=miles    # for Miles
NEXT_PUBLIC_CHARACTER_KEY=nyx      # for Nyx (female)
NEXT_PUBLIC_CHARACTER_KEY=chloe    # for Chloe (female)
NEXT_PUBLIC_CHARACTER_KEY=aiko     # for Aiko (female) 
NEXT_PUBLIC_CHARACTER_KEY=zaria    # for Zaria (female)
NEXT_PUBLIC_CHARACTER_KEY=nova     # for Nova (female)
```

Then restart your dev server: `npm run dev`

### Method 2: Quick Character Switcher Component
Add this to any page for quick testing:

```tsx
<select onChange={(e) => {
  localStorage.setItem('dev_character', e.target.value);
  window.location.reload();
}}>
  <option value="chase">Chase (Bad Boy)</option>
  <option value="dom">Dominic (Dominant)</option>
  <option value="ethan">Ethan (Professional)</option>
  <option value="jayden">Jayden (Laid-back)</option>
  <option value="miles">Miles (Tech Geek)</option>
</select>
```

## 🎯 Character Testing Scenarios

### Chase (Bad Boy) Testing
- **Theme**: Dark red/pink gradient
- **Personality**: Seductive bad boy  
- **Test flows**: NSFW unlock, voice calls, direct NSFW purchase

### Dom (Dominic) Testing  
- **Theme**: Dark blue/violet
- **Personality**: Commanding, dominant
- **Test flows**: Power dynamics, premium features

### Ethan (Professional) Testing
- **Theme**: Blue/cyan professional
- **Personality**: Business-minded, sophisticated
- **Test flows**: Professional relationship, upgrade paths

## 🔧 Current Setup
- Localhost automatically uses `localhost:3000` config from `characters.config.ts`
- Character determined by `NEXT_PUBLIC_CHARACTER_KEY` environment variable
- All Stripe prices use generic `STRIPE_PRICE_*` env vars
- Themes automatically switch based on character key