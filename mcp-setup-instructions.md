# Supabase MCP Configuration

## Step 1: Configure MCP in Windsurf

You need to manually add the Supabase MCP configuration to your Windsurf settings.

### Option A: Using Windsurf UI (Recommended)
1. Open Windsurf
2. Go to Settings (⌘ + ,)
3. Search for "MCP" or "Model Context Protocol"
4. Add the Supabase MCP server configuration

### Option B: Manual Configuration
1. Open or create the file: `~/.codeium/windsurf/mcp_config.json`
2. Add the following configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.supabase.com/mcp?project_ref=nndwujrwetvtgxqlxhuo"
      ]
    }
  }
}
```

**Note:** Replace `nndwujrwetvtgxqlxhuo` with your actual Supabase project reference ID.

### How to Find Your Project Reference ID:
1. Go to your Supabase dashboard
2. Click on "Settings" → "API"
3. Look for "Project URL" - it will be like `https://nndwujrwetvtgxqlxhuo.supabase.co`
4. The project ref is the part before `.supabase.co`

## Step 2: Install Supabase Agent Skills (Optional but Recommended)

Agent Skills provide AI coding tools with ready-made instructions for working with Supabase.

Run this command in your terminal:

```bash
npx skills add supabase/agent-skills
```

This will give Cascade better context about:
- Supabase database operations
- Row Level Security policies
- Authentication patterns
- Real-time subscriptions
- Edge Functions
- Storage operations

## What MCP Does

The Model Context Protocol (MCP) allows Cascade to:
- ✅ Query your Supabase database schema directly
- ✅ Understand your table structures
- ✅ See your RLS policies
- ✅ Access project configuration
- ✅ Make more accurate suggestions based on your actual database

## Benefits for This Quiz Project

With MCP configured, I can:
- Automatically verify the `leaderboard` table exists
- Check if columns match the code
- Suggest optimized queries
- Help debug database issues faster
- Recommend proper RLS policies

## Restart Required

After adding the MCP configuration, restart Windsurf for the changes to take effect.
