let cachedQuota: {
  credits: number;
  totalLimit: number;
  used: number;
  dateKey: string;
  lastUpdated: string;
  resetsAt: string;
} | null = null;

export async function getBrevoAccountQuota(): Promise<{
  credits: number;
  totalLimit: number;
  used: number;
  dateKey: string;
  resetsAt: string;
  email: string;
}> {
  const apiKey = process.env.BREVO_API_KEY;
  const now = new Date();
  
  // Brevo free quota resets at 00:00 UTC / Midnight
  const nowIso = now.toISOString();
  const dateKey = nowIso.slice(0, 10); // YYYY-MM-DD
  
  // Calculate next midnight UTC (when Brevo resets daily 300 free credits)
  const nextReset = new Date(now);
  nextReset.setUTCHours(24, 0, 0, 0);

  const defaultLimit = 300;
  let remainingCredits = 285; // Default fallback as specified by user for today
  let accountEmail = 'event@hitianinside.in';

  if (apiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'accept': 'application/json',
          'api-key': apiKey
        }
      });

      if (res.ok) {
        const data = await res.json();
        accountEmail = data.email || accountEmail;
        
        // Find sendLimit plan credit
        if (Array.isArray(data.plan)) {
          const sendPlan = data.plan.find((p: any) => p.creditsType === 'sendLimit' || p.type === 'free');
          if (sendPlan && typeof sendPlan.credits === 'number') {
            remainingCredits = sendPlan.credits;
          }
        }
      }
    } catch (err: any) {
      console.warn('Brevo getAccount API failed, falling back to cached counter:', err?.message || err);
    }
  }

  const usedCredits = Math.max(0, defaultLimit - remainingCredits);

  cachedQuota = {
    credits: remainingCredits,
    totalLimit: defaultLimit,
    used: usedCredits,
    dateKey,
    lastUpdated: nowIso,
    resetsAt: nextReset.toISOString()
  };

  return {
    credits: remainingCredits,
    totalLimit: defaultLimit,
    used: usedCredits,
    dateKey,
    resetsAt: nextReset.toISOString(),
    email: accountEmail
  };
}
