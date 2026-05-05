import express from 'express';
import path from 'path';
import webpush from 'web-push';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";

import { createClient } from '@supabase/supabase-js';

dotenv.config();

let supabaseClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return null;
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

console.log("[SERVER] Booting MeteorGrade Core...");

// Notification Constants
const VAPID_KEYS = {
  publicKey: 'BMVhPPfW7m9VMZzm4PEYCcu3Xd-Oklga_fXKWAi377m-vpckdv5hvNEzLgBP2CbBmjhdQGz-clrhqSSO7ObgjEM',
  privateKey: 'f4nssLqsZHfr6_ELTdc9ID9nkv-tKX3BmbPk6iyG-f0',
  subject: 'mailto:ops@meteorgrade.io'
};

// Notification Initialization
try {
  let pubKey = process.env.VITE_VAPID_KEY;
  let privKey = process.env.VAPID_PRIVATE_KEY;

  if (!pubKey || !privKey || pubKey.length < 20 || privKey.length < 20) {
    pubKey = VAPID_KEYS.publicKey;
    privKey = VAPID_KEYS.privateKey;
    console.log("[PUSH] Using hardcoded MeteorGrade production keys.");
  } else {
    console.log("[PUSH] Using environment-provided keys.");
  }

  webpush.setVapidDetails(
    VAPID_KEYS.subject,
    pubKey,
    privKey
  );
  
  console.log(`[PUSH] Web Push initialized. Subject: ${VAPID_KEYS.subject}`);
} catch (e) {
  console.error("[PUSH] Failed to initialize Web Push:", e);
}

// AI Utility Helper (Removed from backend per directives)
const serverLogs: string[] = [];
function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  serverLogs.push(line);
  if (serverLogs.length > 500) serverLogs.shift();
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Basic Health Check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      healthy: true,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      projectName: "METEORGRADE"
    });
  });

  app.get('/api/debug/logs', (req, res) => {
    res.type('text/plain').send(serverLogs.join('\n'));
  });

  // AI Grading Proxy Endpoint (Removed - Frontends must call SDK directly)
  app.post('/api/ai/generate', async (req, res) => {
    res.status(410).json({ error: "Server-side AI proxy is deprecated. Switch to client-side SDK usage." });
  });

  // Notification Endpoint
  app.post('/api/notifications/broadcast', async (req, res) => {
    const { title, body, tokens } = req.body;
    
    // We already initialized webpush globally at the top level.
    // If VITE_VAPID_KEY or VAPID_PRIVATE_KEY were changed, the server needs a restart.

    if (!title || !body || !tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: "Missing required fields: title, body, and non-empty tokens array" });
    }

    try {
      console.log(`[BROADCAST] Starting broadcast for: ${title} to ${tokens.length} recipients`);
      const payload = JSON.stringify({ title, body });
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const token of tokens) {
         try {
           if (!token) continue;
           let sub = token;
           if (typeof token === 'string') {
             try {
               sub = JSON.parse(token);
             } catch (e) {
               console.error("[BROADCAST] Double-stringification detected or invalid JSON in token");
             }
           }
           await webpush.sendNotification(sub, payload);
           successCount++;
         } catch (e: any) {
           failureCount++;
           const errStatus = e.statusCode || 0;
           const errMsg = e.message || String(e);
           
           if (errors.length < 5) errors.push(`[${errStatus}] ${errMsg}`);
           
           if (errStatus === 410 || errStatus === 404 || errStatus === 403) {
             console.log(`[BROADCAST] Target signal lost or terminal mismatch (${errStatus})`);
           } else {
             console.error(`[BROADCAST] Unexpected transmission error:`, errStatus, errMsg);
           }
         }
      }

      console.log(`[BROADCAST] Completed: ${successCount} success, ${failureCount} failure`);
      res.json({ 
        success: true, 
        successCount, 
        failureCount,
        recentErrors: errors
      });
    } catch (error: any) {
      console.error("[BROADCAST] Fatal failure:", error);
      res.status(500).json({ error: "Internal server error during broadcast", details: error.message });
    }
  });

  // Cache for atmospheric telemetry to reduce downstream pressure and prevent rate limiting
  const globalTelemetryCache = new Map<string, { data: any, timestamp: number }>();
  const TELEMETRY_CACHE_TTL = 300000; // 5 minute standard cache

  // API Proxy for NWS Alerts - Hardened with deeper caching and smarter invalidation
  app.get('/api/nws-stream/alerts', async (req, res) => {
    const cacheKey = `nws_${JSON.stringify(req.query)}`;
    const cached = globalTelemetryCache.get(cacheKey);
    const now = Date.now();
    
    // Serve from cache if fresh (under 2 minutes for high-res tactical data)
    // or if we have a valid cache and the system is under pressure (implied catch-all)
    if (cached && (now - cached.timestamp < 120000)) {
       return res.json(cached.data);
    }

    try {
      const baseUrl = 'https://api.weather.gov/alerts/active';
      const url = new URL(baseUrl);
      
      Object.keys(req.query || {}).forEach(key => {
        const val = req.query[key];
        if (Array.isArray(val)) {
          val.forEach(v => {
            if (typeof v === 'string') url.searchParams.append(key, v);
          });
        } else if (typeof val === 'string') {
          url.searchParams.append(key, val);
        }
      });
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/geo+json',
          'User-Agent': 'MeteorGradeTactical/2.0 (https://meteorgrade.io; ops@meteorgrade.io)'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        const status = response.status;
        
        // If we hit a rate limit (429) or NWS is down (5xx), serve stale data if available
        if ((status === 429 || status >= 500) && cached) {
          console.warn(`[SERVER] Downstream ${status}. Serving stale telemetry for ${cacheKey}`);
          return res.json(cached.data);
        }

        const errorText = await response.text();
        return res.status(status).json({ error: "NWS Uplink Failure", details: errorText });
      }
      
      const data = await response.json();
      globalTelemetryCache.set(cacheKey, { data, timestamp: now });
      return res.json(data);
    } catch (error: any) {
      console.error(`[SERVER] Telemetry fetch timeout or crash for ${cacheKey}: ${error.message}`);
      if (cached) {
        return res.json(cached.data);
      }
      res.status(503).json({ error: 'Atmospheric sensor relay timeout. Please retry signal.' });
    }
  });

  // Auth Callback for OAuth Popups
  app.get('/auth/callback', (req, res) => {
    console.log(`[AUTH CALLBACK] Hit from: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
    
    // We pass the public environment variables to the client-side callback
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
          <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: white; text-align: center; }
            .loader { border: 3px solid #333; border-top: 3px solid #ff0055; border-radius: 50%; width: 32px; height: 32px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            p { font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <p id="status">Syncing Terminal Credentials...</p>
          <button id="manualClose" style="display:none; margin-top:20px; padding:12px 24px; background:#ff0055; color:white; border:none; font-weight:bold; cursor:pointer;" onclick="window.close()">Close Window</button>
          
          <script>
            async function handleAuth() {
              const url = ${JSON.stringify(supabaseUrl)};
              const key = ${JSON.stringify(supabaseAnonKey)};
              
              if (!url || !key) {
                console.error("Supabase config missing in callback");
                document.getElementById('status').innerText = "Configuration Error. Please contact support.";
                document.getElementById('manualClose').style.display = 'block';
                return;
              }

              try {
                const supabase = window.supabase.createClient(url, key);
                
                // Supabase.onAuthStateChange or getSession will process the hash automatically
                const { data, error } = await supabase.auth.getSession();
                
                if (error) throw error;
                
                if (data.session) {
                  console.log("Session verified in callback window");
                  if (window.opener) {
                    window.opener.postMessage({ type: 'SUPABASE_AUTH_COMPLETED' }, '*');
                    document.getElementById('status').innerText = 'Authentication successful. Closing...';
                    setTimeout(() => window.close(), 1500);
                  } else {
                    window.location.href = '/';
                  }
                } else {
                  console.log("No session found in fragment, waiting...");
                  // Sometimes it takes a moment for the lib to parse
                  setTimeout(handleAuth, 500);
                }
              } catch (err) {
                console.error("Auth process error:", err);
                document.getElementById('status').innerText = "Encryption Error: " + err.message;
                document.getElementById('manualClose').style.display = 'block';
              }
            }

            // Start processing
            setTimeout(handleAuth, 100);
            
            // Safety timeout
            setTimeout(() => {
              if (document.getElementById('status').innerText.includes('Syncing')) {
                document.getElementById('manualClose').style.display = 'block';
                document.getElementById('status').innerText = 'Authentication taking longer than expected...';
              }
            }, 10000);
          </script>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    log("[SERVER] Initializing Vite middleware...");
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    log(`[SERVER] MeteorGrade intelligence relay active on http://0.0.0.0:${PORT}`);
    startDailyScheduler();
    startStormWatchdog();
    
    // Immediate trigger for watchdog on boot
    setTimeout(() => {
      log("[WATCHDOG] Initial boot scan triggered...");
      runStormScan();
    }, 5000);
  });
}

/**
 * Storm Watchdog
 * Monitors NWS alerts and auto-generates strategic missions for major events.
 */
async function runStormScan() {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    log("[WATCHDOG] Analyzing national atmospheric projections for mission potential...");
    
    // Fetch active alerts - including Watches and Advisories (predictions)
    const response = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert,update', {
      headers: { 
        'Accept': 'application/geo+json',
        'User-Agent': 'MeteorGradeBot/1.0 (https://meteorgrade.io; ops@meteorgrade.io)'
      }
    });
    
    if (!response.ok) throw new Error(`NWS API failure: ${response.status}`);
    const data = await response.json();
    const features = data.features || [];

    // Filter for severe categories that imply a "Mission"
    // Requirement: Only for future events (not ones happening now), as flash points handle current ones.
    const highStakes = features.filter((a: any) => {
      const event = a.properties.event.toLowerCase();
      const severity = a.properties.severity;
      const onsetStr = a.properties.onset || a.properties.effective;
      const onset = onsetStr ? new Date(onsetStr) : null;
      const now = new Date();
      
      // Determine if it's a future event. 
      // 1. If it's a "Watch", it's a projection of future threat.
      // 2. If it's a "Warning" or "Advisory", we only take it if it hasn't started yet (onset in future).
      const isWatch = event.includes('watch');
      const isFutureOnset = onset ? onset > now : false;
      const isFuture = isWatch || isFutureOnset;
      
      return (
        event.includes('thunderstorm') || 
        event.includes('tornado') || 
        event.includes('severe storm') ||
        event.includes('flood') ||
        event.includes('blizzard') ||
        event.includes('hurricane') ||
        event.includes('tropical') ||
        event.includes('winter storm')
      ) && (
        severity === 'Severe' || severity === 'Extreme' || isWatch
      ) && isFuture;
    });

    if (highStakes.length < 2) {
      log("[WATCHDOG] Insufficient projected atmospheric tension for a new strategic mission.");
      return;
    }

    log("[WATCHDOG] Rule-based future mission synthesis activated...");
    
    // Simple alert-based mission grouping
    const categories = {
      'Storm': highStakes.filter((a: any) => a.properties.event.toLowerCase().includes('storm') || a.properties.event.toLowerCase().includes('thunderstorm')),
      'Tornado': highStakes.filter((a: any) => a.properties.event.toLowerCase().includes('tornado')),
      'Flood': highStakes.filter((a: any) => a.properties.event.toLowerCase().includes('flood')),
      'Winter': highStakes.filter((a: any) => a.properties.event.toLowerCase().includes('winter') || a.properties.event.toLowerCase().includes('blizzard'))
    };

    const missions: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    Object.entries(categories).forEach(([type, alerts]) => {
      if (alerts.length > 0) {
        const topArea = alerts[0].properties.areaDesc.split(';')[0];
        missions.push({
          title: `Operation: ${type} Intercept - ${topArea}`,
          description: `Strategic monitoring of ${alerts.length} projected ${type.toLowerCase()} events across the region. Scientific verification required for this upcoming theatre.`,
          severity: alerts[0].properties.severity || 'Severe',
          category: type,
          start_date: today,
          status: 'active',
          is_reviewed: false,
          is_global: true
        });
      }
    });

    const newlyDeployedMissions: any[] = [];

    for (const mission of missions.slice(0, 3)) {
      const globalId = `theatre_${mission.region_id}_${today.replace(/-/g, '')}`;
      
      const { data: existing } = await supabase
        .from('missions')
        .select('id')
        .eq('global_id', globalId)
        .maybeSingle();

      if (existing) continue;

      // Smart duration: ensure weekend missions last through Monday
      let duration = mission.duration_days || 3;
      const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon... 4=Thu, 5=Fri
      if ((dayOfWeek >= 4 || mission.is_weekend) && duration < 4) {
        duration = 5; // Carry through the weekend
      }

      const endDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      log(`[WATCHDOG] Deploying new strategic mission: ${mission.title}`);

      await supabase
        .from('missions')
        .insert({
          title: mission.title,
          description: mission.description,
          global_id: globalId,
          category: 'Strategic Theatre',
          severity: mission.severity || 'Severe',
          is_active: true,
          is_global: true,
          start_date: today,
          end_date: endDate,
          status: 'active',
          user_id: 'global'
        });
      
      newlyDeployedMissions.push(mission);
    }

    // Broadcast consolidated notification if any new missions were deployed
    if (newlyDeployedMissions.length > 0) {
      const { data: users } = await supabase.from('users').select('push_subscriptions').eq('notifications_enabled', true);
      if (users && users.length > 0) {
        const allTokens = users.flatMap(u => u.push_subscriptions || []);
        
        let payloadTitle = "STRATEGIC MISSION DEPLOYED";
        let payloadBody = "";
        
        if (newlyDeployedMissions.length === 1) {
          payloadBody = `${newlyDeployedMissions[0].title}: Intelligence projected for 72h.`;
        } else {
          payloadTitle = "MULTIPLE MISSIONS DEPLOYED";
          payloadBody = `${newlyDeployedMissions.length} theatres of operation established. Strategic intercept required.`;
        }

        const payload = JSON.stringify({
          title: payloadTitle,
          body: payloadBody,
          url: "/missions"
        });

        for (const token of allTokens) {
          try {
            const sub = typeof token === 'string' ? JSON.parse(token) : token;
            await webpush.sendNotification(sub, payload);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    log(`[WATCHDOG] Scan error: ${err}`);
  }
}

function startStormWatchdog() {
  log("[WATCHDOG] Storm Watchdog initialized. Monitoring atmospheric threats...");
  const checkInterval = 30 * 60 * 1000; // 30 minutes
  setInterval(runStormScan, checkInterval);
}

function startDailyScheduler() {
  log("[SCHEDULER] Daily briefing engine initialized.");
  
  const checkInterval = 15 * 60 * 1000; // 15 mins
  
  setInterval(async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        log("[SCHEDULER] Signal Ignored: Supabase configuration missing (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
        return;
      }
      
      log("[SCHEDULER] Tick: Checking for pending daily briefings...");
      const { data: users, error } = await supabase
        .from('users')
        .select('id, timezone, push_subscriptions, last_daily_at')
        .eq('notifications_enabled', true);

      if (error) throw error;
      if (!users || users.length === 0) return;

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      for (const user of users) {
        // Skip if already sent today
        if (user.last_daily_at && user.last_daily_at.startsWith(today)) continue;

        try {
          // Check local time
          const formatter = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: user.timezone || 'UTC'
          });
          const localHour = parseInt(formatter.format(now));

          if (localHour === 8) {
            log(`[SCHEDULER] Triggering 0800 prompt for user ${user.id} (${user.timezone})`);
            
            const payload = JSON.stringify({
              title: "DAILY BRIEFING",
              body: "Submit your daily forecast.",
              url: "/forecast"
            });

            let delivered = 0;
            let dropped = 0;
            const subs = Array.isArray(user.push_subscriptions) ? user.push_subscriptions : [];
            const activeSubs = [...subs];
            let changed = false;

            for (let i = 0; i < activeSubs.length; i++) {
              const subStr = activeSubs[i];
              try {
                const sub = typeof subStr === 'string' ? JSON.parse(subStr) : subStr;
                await webpush.sendNotification(sub, payload);
                delivered++;
              } catch (e: any) {
                dropped++;
                log(`[SCHEDULER] Push dropped for user ${user.id}: ${e.message || e}`);
                if (e.statusCode === 410 || e.statusCode === 403) {
                  log(`[SCHEDULER] Pruning dead/invalid token (Status ${e.statusCode}) for user ${user.id}`);
                  activeSubs.splice(i, 1);
                  i--;
                  changed = true;
                }
              }
            }
            
            if (changed) {
              await supabase
                .from('users')
                .update({ push_subscriptions: activeSubs })
                .eq('id', user.id);
            }

            log(`[SCHEDULER] User ${user.id} Sync Result: ${delivered} DELIVERED | ${dropped} DROPPED`);

            // Mark as sent
            await supabase
              .from('users')
              .update({ last_daily_at: now.toISOString() })
              .eq('id', user.id);
          }
        } catch (err) {
          log(`[SCHEDULER] Error processing user ${user.id}: ${err}`);
        }
      }
    } catch (err) {
      log(`[SCHEDULER] Fatal tick error: ${err}`);
    }
  }, checkInterval);
}

startServer().catch(err => {
  console.error("FATAL: MeteorGrade Server failed to initialize:", err);
  process.exit(1);
});
